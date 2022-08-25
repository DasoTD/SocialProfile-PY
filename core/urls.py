from django import views
from django.urls import path
from . import views


urlpatterns = [
    path('', view=views.index, name="index"),
    path('signup/', view=views.signup, name="signup"),
    path('signin/', view=views.signin, name="sigin"),
    path('logout/', view=views.logout, name="logout"),
    path('follow/', view=views.follow, name="follow"),
    path('setting/', view=views.setting, name="setting"),
    path('upload/', view=views.upload, name="upload"),
    path('likepost/<str:post_id>/', view=views.likePost, name="likepost"),
    path('profile/<str:pk>/', view=views.profile, name="profile"),
]