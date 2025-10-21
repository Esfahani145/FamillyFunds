from decimal import Decimal
from django.utils import timezone
from rest_framework import serializers
from .models import User, Payment, Loan, Fund, MonthlyCharge, calculate_due, Membership


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = (
            'id',
            'national_id',
            'fullname',
            'username',
            'phone',
            'first_name',
            'last_name',
            'email',
            'monthly_charge',
            'join_date',
            'role',
            'password',
        )

    read_only_fields = ('monthly_charge', 'join_date', 'role', 'id')

    def update(self, instance, validated_data):
        password = validated_data.pop('password', None)
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        if password:
            instance.set_password(password)
        instance.save()
        return instance


class PaymentSerializer(serializers.ModelSerializer):
    user_fullname = serializers.CharField(source='user.fullname', read_only=True)
    fund_name = serializers.CharField(source='fund.name', read_only=True)

    class Meta:
        model = Payment
        fields = [
            'id',
            'user',
            'user_fullname',
            'fund',
            'fund_name',
            'amount',
            'status',
            'is_confirmed',
            'confirm_date',
            'created_at',
            'admin_note',
            'user_note',
            'monthly_charge_amount',
        ]
        read_only_fields = ['user', 'status', 'is_confirmed', 'confirm_date']
        extra_kwargs = {
            'user_note': {'required': False},
            'admin_note': {'required': False},
        }


class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = '__all__'


class FundSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.fullname", read_only=True)
    manager = serializers.IntegerField(source="manager.id", read_only=True)
    members = UserSerializer(many=True, read_only=True)
    charge_due = serializers.SerializerMethodField()
    loan_due = serializers.SerializerMethodField()
    user_monthly_charge = serializers.SerializerMethodField()  # این فیلد

    class Meta:
        model = Fund
        fields = [
            'id', 'name', 'manager', 'manager_name', 'balance',
            'charge_due', 'loan_due', 'user_monthly_charge', 'members'
        ]

    def get_charge_due(self, obj):
        fund = self.context.get("fund")
        if not fund:
            return 0
        membership = Membership.objects.filter(user=obj, fund=fund).first()
        return membership.charge_due if membership else 0

    def get_loan_due(self, obj):
        request = self.context.get("request")
        fund = self.context.get("fund")  # ← از context بگیر
        if not fund or not request:
            return 0

        loans = Loan.objects.filter(user=obj, fund=fund, is_approved=True)
        return sum(loan.remaining_amount for loan in loans)

    def get_user_monthly_charge(self, obj):  # ← این متد باید اضافه باشه
        user = self.context['request'].user
        return calculate_due(user)


class FundMemberSerializer(serializers.ModelSerializer):
    fullname = serializers.CharField(read_only=True)
    charge_due = serializers.SerializerMethodField()
    loan_due = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = ['id', 'username', 'fullname', 'charge_due', 'loan_due']

    def get_charge_due(self, obj):
        fund = self.context.get("fund")
        if not fund:
            return 0
        membership = Membership.objects.filter(user=obj, fund=fund).first()
        return membership.charge_due if membership else 0

    def get_loan_due(self, obj):
        request = self.context.get("request")
        fund = self.context.get("fund")  # ← از context بگیر
        if not fund or not request:
            return 0

        loans = Loan.objects.filter(user=obj, fund=fund, is_approved=True)
        return sum(loan.remaining_amount for loan in loans)


class MonthlyChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyCharge
        fields = '__all__'
