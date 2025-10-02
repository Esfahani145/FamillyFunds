import self
from django.contrib.auth.models import AbstractUser
from django.db import models
from django.conf import settings
import math



class User(AbstractUser):
    national_id = models.CharField(max_length=10, unique=True)
    fullname = models.CharField(max_length=100)
    phone = models.CharField(max_length=15, blank=True, null=True)
    monthly_charge = models.PositiveIntegerField(default=0)
    join_date = models.DateField(auto_now_add=True)
    role = models.CharField(max_length=20, choices=[('admin', 'Admin'), ('member', 'Member')], default='member')

    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = ['national_id', 'fullname', 'phone']


class Fund(models.Model):
    name = models.CharField(max_length=100)
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name="managed_funds")
    balance = models.DecimalField(max_digits=15, decimal_places=2, default=0)
    members = models.ManyToManyField(User, related_name="fund_members", blank=True)
    def __str__(self):
        return self.name

    @property
    def manager_name(selfself):
        return self.manager.fullname


class Payment(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fund = models.ForeignKey(Fund, on_delete=models.CASCADE, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    confirm_date = models.DateField(null=True, blank=True)
    is_confirmed = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True, null=True)
    user_note = models.TextField(blank=True, null=True)
    monthly_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.fullname} → {self.fund.name} ({self.amount})"


class Loan(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name="loans")
    fund = models.ForeignKey(Fund, on_delete=models.CASCADE, related_name="loans")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    is_confirmed = models.BooleanField(default=False)
    request_date = models.DateTimeField(auto_now_add=True)
    confirm_date = models.DateTimeField(blank=True, null=True)
    requested_amount = models.PositiveIntegerField()
    approved_amount = models.PositiveIntegerField(null=True, blank=True)
    installments_count = models.PositiveIntegerField(null=True, blank=True)
    installment_amount = models.PositiveIntegerField(null=True, blank=True)
    paid_installments = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    is_approved = models.BooleanField(default=False)

    def approve(self, approved_amount, max_installment=1_000_000):
        self.approved_amount = approved_amount
        self.is_approved = True
        self.installments_count = (approved_amount // max_installment) + (1 if approved_amount % max_installment else 0)
        self.installment_amount = approved_amount // self.installments_count

    @property
    def remaining_installments(self):
        return (self.installments_count or 0) - self.paid_installments

    @property
    def remaining_amount(self):
        if not self.installments_count:
            return 0
        return self.remaining_installments * self.installment_amount

    def __str__(self):
        return f"{self.user.fullname} ← {self.fund.name} ({self.amount})"


class MonthlyCharge(models.Model):
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    start_date = models.DateField()
    row_number = models.IntegerField()

    def __str__(self):
        return f"شارژ {self.amount} - ردیف {self.row_number}"
