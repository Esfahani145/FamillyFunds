from rest_framework import serializers
from .models import User, Payment, Loan, Fund, MonthlyCharge


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
    class Meta:
        model = Payment
        fields = '__all__'


class LoanSerializer(serializers.ModelSerializer):
    class Meta:
        model = Loan
        fields = '__all__'


class FundSerializer(serializers.ModelSerializer):
    manager_name = serializers.CharField(source="manager.fullname", read_only=True)
    manager = serializers.IntegerField(source="manager.id", read_only=True)
    members = UserSerializer(many=True, read_only=True)
    class Meta:
        model = Fund
        fields = ['id', 'name', 'manager_name','manager', 'balance', 'members']


class MonthlyChargeSerializer(serializers.ModelSerializer):
    class Meta:
        model = MonthlyCharge
        fields = '__all__'
