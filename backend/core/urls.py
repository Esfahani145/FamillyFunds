from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import UserViewSet, LoanViewSet, FundViewSet, MonthlyChargeViewSet, PaymentViewSet, user_info
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

router = DefaultRouter()
router.register('users', UserViewSet)
router.register('payments', PaymentViewSet)
router.register('loans', LoanViewSet)
router.register(r'funds', FundViewSet)
router.register('monthly_charges', MonthlyChargeViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('user/', user_info),
]
