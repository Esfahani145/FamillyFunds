# core/signals.py
from django.db.models.signals import post_save
from django.dispatch import receiver
from .models import Payment, Loan

@receiver(post_save, sender=Payment)
def update_fund_balance_on_payment(sender, instance, created, **kwargs):
    if instance.is_confirmed:
        fund = instance.fund
        fund.balance += instance.amount
        fund.save()

@receiver(post_save, sender=Loan)
def update_fund_balance_on_loan(sender, instance, created, **kwargs):
    if instance.is_confirmed and instance.is_approved:
        fund = instance.fund
        fund.balance -= instance.approved_amount or 0
        fund.save()
