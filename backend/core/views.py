from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from tinycss2 import serialize
from decimal import Decimal
from rest_framework import status
from zmq.decorators import context
from .permissions import IsAdminRole
from rest_framework.permissions import IsAdminUser
from . import models
from .models import User, Loan, Payment, Fund, MonthlyCharge, Membership
from .serializers import UserSerializer, PaymentSerializer, LoanSerializer, FundSerializer, MonthlyChargeSerializer, \
    FundMemberSerializer
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from django.contrib.auth import get_user_model
from django.utils import timezone
from django.contrib.auth.hashers import make_password
from django.db.utils import IntegrityError
from django.utils.timezone import now

User = get_user_model()


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', '') == 'admin'


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role != 'admin':
            return User.objects.filter(id=user.id)
        return User.objects.all()

    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all().order_by('-created_at')
        return Payment.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def approve(self, request, pk=None):
        payment = self.get_object()

        if payment.status == 'approved':
            return Response({"error": "پرداخت قبلاً تأیید شده است."}, status=status.HTTP_400_BAD_REQUEST)

        payment.status = 'approved'
        payment.is_confirmed = True
        payment.confirm_date = timezone.now()
        payment.save()

        user = payment.user
        fund = payment.fund

        # # تشخیص نوع پرداخت: وام یا شارژ
        # if "وام" in (payment.user_note or ""):
        #     # اضافه کردن مبلغ وام به موجودی کاربر
        #     user.balance += Decimal(payment.amount)
        #
        #     # اگر عضوی از صندوق است، بدهی وام در عضویت اضافه می‌شود
        #     membership = Membership.objects.filter(user=user, fund=fund).first()
        #     if membership:
        #         membership.loan_due += Decimal(payment.amount)
        #         membership.save()
        # else:
        #     # پرداخت شارژ: بدهی شارژ کم می‌شود
        #     membership = Membership.objects.filter(user=user, fund=fund).first()
        #     if membership:
        #         membership.charge_due = max(Decimal('0.00'), membership.charge_due - Decimal(payment.amount))
        #         membership.save()

        if "وام" in (payment.user_note or ""):
            # وام
            user.balance += Decimal(payment.amount)
            membership = Membership.objects.filter(user=user, fund=fund).first()
            if membership:
                membership.loan_due += Decimal(payment.amount)
                membership.save()
        else:
            # پرداخت شارژ: فقط ذخیره payment کافیست
            pass

        user.save()
        return Response({'status': 'approved'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def reject(self, request, pk=None):
        payment = self.get_object()
        reason = request.data.get('admin_note', '')

        if payment.status == 'approved':
            return Response({"error": "پرداخت قبلاً تأیید شده است."},
                            status=status.HTTP_400_BAD_REQUEST)

        payment.status = 'rejected'
        payment.admin_note = reason or "بدون توضیح"
        payment.is_confirmed = True
        payment.confirm_date = timezone.now().date()
        payment.save()

        return Response({
            "message": "پرداخت رد شد",
            "payment_id": payment.id,
            "status": payment.status,
            "admin_note": payment.admin_note,
        }, status=status.HTTP_200_OK)


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all().order_by('-created_at')
    serializer_class = LoanSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        loan = serializer.save(user=self.request.user)

        Payment.objects.create(
            user=self.request.user,
            fund=loan.fund,
            amount=loan.requested_amount,
            status='pending',
            is_confirmed=False,
            user_note=f"درخواست وام به مبلغ {loan.requested_amount:,} تومان",
        )

    def get_permissions(self):
        if self.action in ['approve']:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]

    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        loan = self.get_object()
        approved_amount = request.data.get('approved_amount')

        if not approved_amount:
            return Response({"error": "approved_amount الزامی است"}, status=status.HTTP_400_BAD_REQUEST)

        approved_amount = Decimal(approved_amount)
        loan.approved_amount = approved_amount
        loan.is_approved = True
        loan.confirm_date = timezone.now()
        loan.save()

        payment = Payment.objects.filter(
            user=loan.user, fund=loan.fund, status='pending'
        ).order_by('-created_at').first()

        if payment:
            payment.status = 'approved'
            payment.is_confirmed = True
            payment.admin_note = "درخواست وام تأیید شد ✅"
            payment.confirm_date = timezone.now()
            payment.save()

        membership = Membership.objects.filter(user=loan.user, fund=loan.fund).first()
        if membership:
            membership.loan_due += approved_amount
            membership.save()

        loan.user.balance += approved_amount
        loan.user.save()

        return Response(LoanSerializer(loan).data, status=status.HTTP_200_OK)


class FundViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fund.objects.all()
    serializer_class = FundSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        fund = self.get_object()
        data = request.data
        national_id = data.get("national_id")
        fullname = data.get("fullname")
        username = data.get("username", "")
        phone = data.get("phone", "")

        if not national_id or not fullname:
            return Response(
                {"error": "لطفاً نام کامل و کد ملی را وارد کنید"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # جلوگیری از تکرار کاربر با همان کد ملی
            if User.objects.filter(national_id=national_id).exists():
                user = User.objects.get(national_id=national_id)
            else:
                user = User.objects.create(
                    national_id=national_id,
                    fullname=fullname,
                    username=username or f"user_{national_id}",
                    phone=phone,
                    role="member",
                    date_joined=timezone.now(),
                )
                user.set_password(national_id)
                user.save()

            # اضافه کردن به صندوق
            fund.members.add(user)

            # ایجاد یا به‌روزرسانی عضویت در صندوق
            membership, created = Membership.objects.get_or_create(
                user=user,
                fund=fund,
                defaults={"joined_at": timezone.now().date()}
            )

            return Response({
                "status": "success",
                "message": "عضو جدید با موفقیت اضافه شد.",
                "user": UserSerializer(user).data,
                "joined_at": membership.joined_at
            }, status=status.HTTP_201_CREATED)

        except IntegrityError as e:
            return Response(
                {"error": f"خطای دیتابیس: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"خطای ناشناخته: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def remove_member(self, request, pk=None):
        fund = self.get_object()
        user_id = request.data.get("user_id")

        if not user_id:
            return Response({"error": "user_id الزامی است"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id)
            fund.members.remove(user)
            return Response({"status": "success", "message": "کاربر از صندوق حذف شد"})
        except User.DoesNotExist:
            return Response({"error": "کاربر یافت نشد"}, status=status.HTTP_404_NOT_FOUND)
        except Exception as e:
            return Response({"error": f"خطای ناشناخته: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def members(self, request, pk=None):
        fund = self.get_object()
        members = fund.members.all()
        serializer = FundMemberSerializer(members, many=True, context={"fund": fund, "request": request})
        serializer = FundMemberSerializer(
            members, many=True, context={"fund": fund, "request": request}
        )
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Fund.objects.all()
        return Fund.objects.filter(Q(manager=user) | Q(members=user)).distinct()

    def get_serializer(self, *args, **kwargs):
        kwargs['context'] = self.get_serializer_context()
        return super().get_serializer(*args, **kwargs)

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        context['with_due'] = True
        return context


class MonthlyChargeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyCharge.objects.all()
    serializer_class = MonthlyChargeSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    membership = Membership.objects.filter(user=request.user).order_by("joined_at").first()
    join_date = membership.joined_at if membership else request.user.date_joined
    return Response({
        "id": request.user.id,
        "username": request.user.username,
        "fullname": request.user.fullname,
        "email": request.user.email,
        "phone": request.user.phone,
        "role": request.user.role,
        "join_date": join_date,
    })


def approve_payment(self, request, pk=None):
    payment = self.get_object()
    payment.status = "approved"
    payment.is_confirmed = True
    payment.confirm_date = timezone.now()
    payment.save()

    loan = Loan.objects.filter(user=payment.user, fund=payment.fund, is_approved=False).last()
    if loan:
        loan.is_approved = True
        loan.confirm_date = timezone.now()
        loan.save()

    return Response({"detail": "پرداخت (و در صورت وجود وام) تأیید شد"})
