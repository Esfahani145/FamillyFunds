from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from tinycss2 import serialize
from .permissions import IsAdminRole
from rest_framework.permissions import IsAdminUser
from . import models
from .models import User, Loan, Payment, Fund, MonthlyCharge
from .serializers import UserSerializer, PaymentSerializer, LoanSerializer, FundSerializer, MonthlyChargeSerializer
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


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Payment.objects.all().order_by('-created_at')
        return Payment.objects.filter(user=user).order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.save()
        if instance.status == 'approved' and not instance.is_confirmed:
            instance.is_confirmed = True
            instance.confirm_date = timezone.now().date()
            instance.user.monthly_charge = max(0, instance.user.monthly_charge - int(instance.amount))
            instance.user.save()
            instance.save()

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def confirm(self, request, pk=None):
        dep = self.get_object()
        dep.manager_confirmed = True
        dep.manager_note = request.data.get('manager_note', '')
        dep.save()
        return Response({'status': 'confirmed'})

    @action(detail=True, methods=['post'], permission_classes=[IsAdminRole])
    def approve(self, request, pk=None):
        payment = self.get_object()
        if payment.status != "approved":
            payment.status = "approved"
            payment.is_confirmed = True
            payment.confirm_date = timezone.now().date()
            payment.user.monthly_charge = max(0, payment.user.monthly_charge - int(payment.amount))
            payment.user.save()
            payment.save()
        return Response({"status": "approved"})


class LoanViewSet(viewsets.ModelViewSet):
    queryset = Loan.objects.all().order_by('-created_at')
    serializer_class = LoanSerializer

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

        try:
            approved_amount = int(approved_amount)
            loan.approve(approved_amount)
            loan.save()
            return Response(LoanSerializer(loan).data, status=status.HTTP_200_OK)
        except ValueError:
            return Response({"error": "مقدار باید عددی باشد"}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({"error": f"خطای ناشناخته: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class FundViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fund.objects.all()
    serializer_class = FundSerializer
    permission_classes = [IsAuthenticated]

    @action(detail=True, methods=['post'])
    def add_member(self, request, pk=None):
        fund = self.get_object()
        data = request.data

        national_id = data.get("national_id")
        fullname = data.get("fullname")
        username = data.get("username", "")  # خالی هم باشه مشکلی نیست
        phone = data.get("phone", "")

        if not national_id or not fullname:
            return Response(
                {"error": "لطفاً نام کامل و کد ملی را وارد کنید"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            if User.objects.filter(national_id=national_id).exists():
                return Response(
                    {"error": "کاربری با این کد ملی قبلاً ثبت شده است."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            user = User.objects.create(
                national_id=national_id,
                fullname=fullname,
                username=username or f"user_{national_id}",  # اگر خالی بود، یک مقدار پیش‌فرض بساز
                phone=phone,
                role="member",
                date_joined=timezone.now(),
            )
            user.set_password(national_id)
            user.save()
            fund.members.add(user)
            return Response({
                "status": "success",
                "message": "عضو جدید ساخته و اضافه شد",
                "user": UserSerializer(user).data
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

    @action(detail=True, methods=['get'])
    def members(self, request, pk=None):
        fund = self.get_object()
        users = fund.members.all()
        serializer = UserSerializer(users, many=True)
        return Response(serializer.data)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Fund.objects.all()
        return Fund.objects.filter(Q(manager=user) | Q(members=user)).distinct()


class MonthlyChargeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyCharge.objects.all()
    serializer_class = MonthlyChargeSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_info(request):
    return Response({
        "username": request.user.username,
        "role": request.user.role,
        "id": request.user.id,
    })
