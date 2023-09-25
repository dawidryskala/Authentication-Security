//jshint esversion:6
import 'dotenv/config';
import express from "express";
import bodyParser from "body-parser";
import path from "path";
import { basename, dirname } from "path";
import { fileURLToPath } from "url";
import ejs from "ejs";
import mongoose from "mongoose";
// import encrypt from "mongoose-encryption";
// import md5 from "md5";
// import bcrypt from "bcrypt";
import session from 'express-session';
import passport from "passport";
import passportLocalMongoose from "passport-local-mongoose";
import findOrCreate from "mongoose-findorcreate";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
// import { Strategy as FacebookStrategy } from "passport-facebook";
import passportFacebook from "passport-facebook";

const FacebookStrategy = passportFacebook.Strategy;


const saltRounds = 10;

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(bodyParser.urlencoded({ extended: true }));

// initial configuration of session 
app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false,
}));

// use passport and initialize the passport package and to deal with session
app.use(passport.initialize());
app.use(passport.session());


mongoose.connect("mongodb://127.0.0.1:27017/userDB");

const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    secret: String,
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user.id);
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);

        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);;
        });
    }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets",
    // enableProof: true
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile)
        User.findOrCreate({ facebookId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));

app.get("/", function (req, res) {
    res.render("home");
});

app.get('/auth/google',
    passport.authenticate('google', { scope: ["profile"] })
);

app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get('/auth/facebook',
    passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
    passport.authenticate('facebook', { failureRedirect: '/login' }),
    function (req, res) {
        // Successful authentication, redirect to secrets.
        res.redirect('/secrets');
    });

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    User.find({ "secret": { $ne: null } }).then(function (foundUsers) {
        if (foundUsers) {
            res.render("secrets", {
                usersWithSecrets: foundUsers
            });
        }
    }).catch(function (err) {
        console.log(err);
    });
});

app.get("/submit", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("submit");
    } else {
        res.redirect("/login");
    }
});

app.post("/submit", function (req, res) {
    const submittedSecret = req.body.secret;
    console.log("-----------------")
    // console.log(req.user.id)

    User.findById(req.user).then(function (foundUser) {
        if (foundUser) {
            foundUser.secret = submittedSecret;
            foundUser.save().then(function () {
                res.redirect("/secrets")
            }).catch(function (err) {
                console.log(err);
                res.redirect("/login")
            });
        }
    }).catch(function (err) {
        console.log(err);
    });
});

app.get("/logout", function (req, res) {
    req.logout(function (err) {
        if (err) {
            console.log(err);
        } else {
            res.redirect("/")
        }
    });
});

app.post("/register", function (req, res) {

    User.register({ username: req.body.username }, req.body.password, function (err, user) {
        if (err) {
            console.log(err);
            res.redirect("/register");
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });

    // bcrypt.hash(req.body.password, saltRounds, function (err, hash) {

    //     const newUser = new User({
    //         email: req.body.username,
    //         password: hash,
    //     })

    //     newUser.save().then(function () {
    //         res.render("secrets")
    //     }).catch(function (err) {
    //         console.log(err);
    //     });

    // });

});

app.post("/login", function (req, res) {

    const user = new User({
        username: req.body.username,
        password: req.body.password
    });

    req.login(user, function (err) {
        if (err) {
            console.log(err);
        } else {
            passport.authenticate("local")(req, res, function () {
                res.redirect("/secrets");
            });
        }
    });


    // const username = req.body.username;
    // const password = req.body.password;

    // User.findOne({ email: username, }).then(function (foundUser) {

    //     if (foundUser) {
    //         console.log("Usere was found")

    //         bcrypt.compare(password, foundUser.password, function (err, result) {
    //             // result == true
    //             if (result === true) {
    //                 res.render("secrets");
    //             } else {
    //                 res.render("login");
    //             }
    //         });

    //     } else if (!foundUser) {
    //         res.render("login");
    //     }
    // }).catch(function (err) {
    //     console.log(err);
    // });
});


app.listen(3000, function () {
    console.log("Server started on port 3000.");
});

