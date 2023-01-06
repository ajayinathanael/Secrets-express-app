//jshint esversion:6

require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require('express-session');
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
// const bcrypt=require("bcrypt");
// const saltRounds=10;
 
const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set('view engine', 'ejs');

app.use(session({
    secret: process.env.SECRET,
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.set("strictQuery", false);
mongoose.connect("mongodb+srv://admin:nath@cluster0.7o8eg7x.mongodb.net/angelaAuthDB?retryWrites=true", {useNewUrlParser: true});

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);


// userSchema.plugin(encrypt, {secret:process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("users", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user,done){
    done(null, user.id);
    });
    
passport.deserializeUser(function(id,done){
     User.findById(id,function(err,user){
    done(err,user);
    })
    })

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3500/auth/google/secrets",
    userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo'
  },

  function(accessToken, refreshToken, profile, cb) {
    // console.log(profile);

    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", (req,res)=>{
    res.render('home');
});

app.get("/auth/google",
  passport.authenticate('google', { scope: ['profile'] }
));

app.get("/auth/google/secrets", 
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect to secrets route.
    res.redirect("/secrets");
  });

app.get("/login", (req,res)=>{
    res.render('login');
});

app.get("/register", (req,res)=>{
    res.render('register');
});

app.get("/secrets", (req,res)=>{

    User.find({"secret": {$ne: null}}, function(err, foundUsers){
        if(err)return next(err);
        if(foundUsers){
            res.render("secrets", {UsersWithSecret: foundUsers})
        }
    });

    // if(req.isAuthenticated()){
    //     res.render("secrets");
    // }else{ 
    //     res.redirect("/login");
    // }
});

app.get("/submit", (req,res)=>{
    if(req.isAuthenticated()){
        res.render("submit");
    }else{ 
        res.redirect("/login");
    }
});

app.post("/submit", (req,res)=>{
    const submittedSecret =req.body.secret;

    console.log(req.user);

    User.findById(req.user.id, (err, foundUser)=>{
        if(err)return next(err);
        if(foundUser){
            foundUser.secret = submittedSecret;
            foundUser.save(function(){
                res.redirect('/secrets');
            })
        }
    });
});

app.get('/logout', function(req, res, next){
    req.logout(function(err) {
      if (err) { return next(err); }
      res.redirect('/');
    });
  });

app.post("/register", (req,res)=>{

    // bcrypt.hash(req.body.password, 10, function(err,hash){
    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash
    //     });   
    //     newUser.save((err)=>{
    //         if(err){
    //             console.log(err);
    //         }else{
    //             res.render('secrets');
    //         }
    //     }) 
    // })    

    User.register({username: req.body.username}, req.body.password, function(err, user){
        if(err){
            return next(err);
            res.redirect('/register');
        }else{
            passport.authenticate('local')(req,res, function(){
                res.redirect('/secrets');
            })
        }
    })
});

app.post("/login", (req,res)=>{

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function(err){
        if(err){
            return next(err);
        }
        else{
            passport.authenticate('local')(req,res, function(){
                res.redirect('/secrets');
            })
        }
    })
    
    // User.findOne({email: username}, function(err, foundUser){
    //     if(err){
    //         console.log(err);
    //     }else{
    //         if(foundUser){
    //             // if(foundUser.password === password){
    //             //     res.render('secrets');
    //             // }
    //             bcrypt.compare(password, foundUser.password, function(err,result){
    //                 if(result === true){
    //                     res.render('secrets');
    //                 }else{
    //                     console.log(err);
    //                 }
    //                 }); 
    //         }
    //     }
    // });

});


//server
let port = process.env.PORT;
app.listen(port, function(){
    console.log(`Server started on port ${port}`);
});
