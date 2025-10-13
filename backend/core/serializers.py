from rest_framework import serializers
from .models import User, Payment, Loan, Fund, MonthlyCharge, calculate_due


class UserSerializer(serializers.ModelSerializer):
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
        )


class PaymentSerializer(serializers.ModelSerializer):
    user_fullname = serializers.CharField(source='user.fullname', read_only=True)
    fund_name = serializers.CharField(source='fund.name', read_only=True)
    class Meta:
        model = Payment
        fields = '__all__'
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
    monthly_charge = serializers.SerializerMethodField()   # 🔹 بدهی کاربر

    class Meta:
        model = Fund
        fields = ['id', 'name', 'manager_name', 'manager', 'balance', 'members', 'monthly_charge']

    def get_monthly_charge(self, obj):
        user = self.context['request'].user
        return calculate_due(user, obj)

class MonthlyChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyCharge
        fields = '__all__'
