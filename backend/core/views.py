from rest_framework import viewsets, permissions, status
from rest_framework.permissions import IsAuthenticated
from .models import User, Loan, Payment, Fund, MonthlyCharge
from .serializers import UserSerializer, PaymentSerializer, LoanSerializer, FundSerializer, MonthlyChargeSerializer
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response


class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return getattr(request.user, 'role', '') == 'admin'


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.all().order_by('-confirm_date')
    serializer_class = PaymentSerializer

    @action(detail=True, methods=['post'], permission_classes=[IsAdmin])
    def confirm(self, request, pk=None):
        dep = self.get_object()
        dep.manager_confirmed = True
        dep.manager_note = request.data.get('manager_note', '')
        dep.save()
        return Response({'status': 'confirmed'})


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
        except ValueError:
            return Response({"error": "مقدار باید عددی باشد"}, status=status.HTTP_400_BAD_REQUEST)

        loan.approve(approved_amount)
        loan.save()

        return Response(LoanSerializer(loan).data, status=status.HTTP_200_OK)


class FundViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Fund.objects.all()
    serializer_class = FundSerializer
    premission_classes = [IsAuthenticated]

    @action(detail=True, methods=['get'])
    def add_member(self, request, pk=None):
        fund = self.get_object()
        user_id = request.data.get('user_id')
        try:
            user = User.objects.get(id=user_id)
            fund.members.add(user)
            return Response({'status': 'success'})
        except User.DoesNotExist:
            return Response({"error": "user not found"}, status=400)

    @action(detail=True, methods=["post"])
    def remove_member(self, request, pk=None):
        fund = self.get_object()
        user_id = request.data.get("user_id")
        try:
            user = User.objects.get(id=user_id)
            fund.members.remove(user)
            return Response({"status": "member removed"})
        except User.DoesNotExist:
            return Response({"error": "user not found"}, status=400)

    def get_queryset(self):
        user = self.request.user
        if user.role == 'admin':
            return Fund.objects.all()
        return Fund.objects.filter(manager=user)


class MonthlyChargeViewSet(viewsets.ModelViewSet):
    queryset = MonthlyCharge.objects.all()
    serializer_class = MonthlyChargeSerializer


@api_view(['Get'])
@permission_classes([IsAuthenticated])
def user_info(request):
    return Response({
        "username": request.user.username,
        "role": request.user.role,
        "id": request.user.id,
    })
