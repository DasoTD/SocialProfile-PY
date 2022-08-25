from ast import Pass
import imghdr
from django.shortcuts import render, redirect
from django.http import HttpResponse
from django.contrib.auth.models import User,  auth
from django.contrib.auth import authenticate
from .models import FollowerCount, Profile, Post, likePost, FollowerCount
from  django.contrib import messages
from django.contrib.auth.decorators import login_required
import logging


# Create your views here.
@login_required(login_url='/signin')
def index(request):
    userObject = User.objects.get(username=request.user.username)
    userProfile = Profile.objects.get(user=userObject)
    posts = Post.objects.all
    return render(request, 'index.html', {'user_profile': userProfile, 'posts': posts})

def signup(request):
    if request.method == "POST":
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']
        password2 = request.POST['password2']

        if password == password2:
            if User.objects.filter(email=email).exists():
                messages.info(request,'email already exist')
                return redirect('/signup')
            elif User.objects.filter(username=username).exists():
                messages.info(request,'username already exist')
                return redirect('/signup')
            else:
                user = User.objects.create_user(username=username, email=email, password=password)
                user.save()
                user_login = auth.authenticate(username=username, password=password)
                auth.login(request, user_login)
                user_model = User.objects.get(username=username)
                new_profile= Profile.objects.create(user=user_model, id_user=user_model.id)
                new_profile.save()
                return redirect('/setting')
        else:
            messages.info(request, 'password not match')
            return redirect('/signup') 
    else:
        return render(request, 'signup.html')

def signin(request):
    if request.method == "POST":
        username = request.POST['username']
        password = request.POST['password']
        user = authenticate(username=username, password=password)
        if user is None:
            messages.info(request, "invalid credentials")
            return redirect('/signin')
        else:
            auth.login(request, user)
            return redirect('/')
            
    else:
        logging.warning('Watch out!')
        logging.basicConfig(filename='example.log', format='%(asctime)s %(message)s', filemode='a', datefmt='%m/%d/%Y %I:%M:%S %p', encoding='utf-8', level=logging.DEBUG)
        logging.debug('This message should go to the log file')
        logging.info('So should this')
        logging.warning('And this, too')
        logging.error('And non-ASCII stuff, too, like Øresund and Malmö')
        # logging.basicConfig(filename='example.log', format='%(asctime)s %(message)s', filemode='w', datefmt='%m/%d/%Y %I:%M:%S %p', encoding='utf-8', level=logging.DEBUG)
        logger = logging.getLogger('simple_example')
        logger.setLevel(logging.DEBUG)

        # create console handler and set level to debug
        ch = logging.StreamHandler()
        ch.setLevel(logging.DEBUG)

        # create formatter
        formatter = logging.Formatter('%(asctime)s - %(name)s - %(levelname)s - %(message)s')

        # add formatter to ch
        ch.setFormatter(formatter)

        # add ch to logger
        logger.addHandler(ch)

        # 'application' code
        logger.debug('debug message')
        logger.info('info message')
        logger.warning('warn message')
        logger.error('error message')
        logger.critical('critical message')
        return render(request, 'signin.html')

@login_required(login_url='/signin')
def logout(request):
    auth.logout(request)
    return redirect('/signin')

@login_required(login_url='/signin')
def setting(request):
    userProfile = Profile.objects.get(user=request.user)
    if request.method == "POST":
        if request.FILES.get('image') == None:
            image = userProfile.profileimg
            bio = request.POST['bio']
            location = request.POST['location']
            userProfile.profileimg = image
            userProfile.bio = bio
            userProfile.location = location
            userProfile.save()
        if request.FILES.get('image') != None:
            image = request.FILES.get('image')
            bio = request.POST['bio']
            location = request.POST['location']
            userProfile.profileimg = image
            userProfile.bio = bio
            userProfile.location = location
            userProfile.save()

        return redirect('/setting')
    else:
        return render(request, 'setting.html', {'user_profile': userProfile})

@login_required(login_url='/signin')
def upload(request):
    if request.method == "POST":
        # if request.FILES.get('image') == None:
        #     # image = request.FILES.get('image_upload')
        #     user = request.user.username
        #     caption = request.POST['caption']
        #     new_post = Post.objects.create(user=user, caption=caption)
        #     new_post.save()
        
        # if request.FILES.get('image') != None:
        user = request.user.username
        image = request.FILES.get('image_upload')
        caption = request.POST['caption']
        new_post = Post.objects.create(user=user, caption=caption, image=image)
        new_post.save()
        return redirect('/')
    else:
        return redirect('/')

def allPost(request):
    Posts = Post.objects.all

@login_required(login_url='/signin')
def likePost(request):
    username = request.user.username
    post_id = request.GET.get('post_id', '')
    post = Post.objects.get(id=post_id)
    
    like_filter = likePost.objects.filter(post_id=post_id, username=username).first()
    if like_filter == None:
        new_like = likePost.objects.create(post_id=post_id, username=username)
        new_like.save()
        post.no_of_likes = post.no_of_likes + 1
        post.save()
        return redirect('/')
    else :
        like_filter.delete()
        post.no_of_likes = post.no_of_likes - 1
        post.save()
        return redirect('/')

@login_required(login_url='/signin')   
def profile(request, pk): 
    userObject = User.objects.get(username=pk)
    userProfile = Profile.objects.get(user=userObject)
    userPost = Post.objects.filter(user=pk)
    userPostLength =  len(userPost)
    context = {
        'userObject': userObject,
        'userProfile': userProfile,
        'userPost': userPost,
        'userPostLength': userPostLength
    }
    return render(request, 'profile.html', context)

def follow(request):
    if request.method == 'POST':
        follower = request.POST['follower']
        user = request.POST['user']
        if FollowerCount.objects.get(follower=follower, user=user):
            delete_follower = FollowerCount.objects.get(follower=follower, user=user)
            delete_follower.delete()
            return redirect('/profile/'+user)
        else:
            new_follower = FollowerCount.objects.get(follower=follower, user=user)
            new_follower.save()
            return redirect('/profile/'+user)
    else: 
        return redirect('/')
