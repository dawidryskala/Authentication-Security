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
});

userSchema.plugin(passportLocalMongoose);

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ["password"] });

const User = mongoose.model("User", userSchema);

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

app.get("/", function (req, res) {
    res.render("home");
});

app.get("/login", function (req, res) {
    res.render("login");
});

app.get("/register", function (req, res) {
    res.render("register");
});

app.get("/secrets", function (req, res) {
    if (req.isAuthenticated()) {
        res.render("secrets");
    } else {
        res.redirect("/login");
    }
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

