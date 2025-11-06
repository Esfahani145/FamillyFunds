from decimal import Decimal
from turtledemo.penrose import start

from django.utils import timezone
from django.contrib.auth.models import AbstractUser
from django.db import models
from datetime import date
# from .models import Payment, Membership

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
    members = models.ManyToManyField(User, through='Membership', related_name="fund_members")

    def __str__(self):
        return self.name

    @property
    def manager_name(self):
        return self.manager.fullname


class Payment(models.Model):
    STATUS_CHOICES = [
        ('pending', 'در انتظار تأیید'),
        ('approved', 'تأیید شده'),
        ('rejected', 'رد شده'),
    ]
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fund = models.ForeignKey(Fund, on_delete=models.CASCADE, blank=True, null=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    confirm_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    is_confirmed = models.BooleanField(default=False)
    admin_note = models.TextField(blank=True, null=True)
    user_note = models.TextField(blank=True, null=True)
    monthly_charge_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    def __str__(self):
        return f"{self.user.fullname} → {self.fund.name} ({self.amount}) ({self.status})"


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


class Membership(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    fund = models.ForeignKey(Fund, on_delete=models.CASCADE)
    joined_at = models.DateField(default=timezone.now)

    charge_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    loan_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        unique_together = ("user", "fund")

    def __str__(self):
        return f"{self.user.fullname} در {self.fund.name}"


def calculate_due(user, fund=None, monthly_amount=30000):
    today = timezone.now().date()

    # تاریخ شروع عضویت
    if fund:
        membership = Membership.objects.filter(user=user, fund=fund).first()
        start_date = membership.joined_at if membership else user.join_date
    else:
        start_date = user.join_date

    # تعداد ماه‌های گذشته
    months = (today.year - start_date.year) * 12 + (today.month - start_date.month)
    if today.day < start_date.day:
        months -= 1

    total_due = months * monthly_amount

    # کل پرداخت‌های تایید شده برای شارژ در این صندوق
    paid_charges = Payment.objects.filter(
        user=user,
        fund=fund,
        status='approved'
    ).exclude(user_note__icontains='وام').aggregate(total=models.Sum('amount'))['total'] or 0

    return max(0, total_due - Decimal(paid_charges))
