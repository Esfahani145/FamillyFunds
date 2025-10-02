from django.contrib import admin
from .models import User, Payment, Loan, MonthlyCharge, Fund


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ("fullname", "username", "national_id", "phone", "monthly_charge", "join_date")
    search_fields = ("fullname", "national_id", "username", "phone")
    list_filter = ("join_date",)


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ("user", "amount", "is_confirmed", "confirm_date", "monthly_charge_amount")
    search_fields = ("user__fullname", "user__national_id")
    list_filter = ("is_confirmed", "confirm_date")


@admin.register(Loan)
class LoanAdmin(admin.ModelAdmin):
    list_display = ("user", "requested_amount", "approved_amount", "installments_count", "paid_installments", "created_at")
    search_fields = ("user__fullname", "user__national_id")
    list_filter = ("approved_amount", "created_at")


@admin.register(MonthlyCharge)
class MonthlyChargeAdmin(admin.ModelAdmin):
    list_display = ("amount", "start_date", "row_number")
    list_filter = ("start_date",)
    ordering = ("-start_date",)


@admin.register(Fund)
class FundAdmin(admin.ModelAdmin):
    list_display = ("name", "manager_name", "balance")
    search_fields = ("name", "manager_name")
