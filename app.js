// app.js
const express = require('express');
const app = express();

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({extended: false}));

// Use __dirname to construct absolute paths for:
// 1. express-static
const path = require('path');
app.use(express.static(path.join(__dirname, 'public')));

// 2. hbs views
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// link db
require('./db');
const mongoose = require('mongoose');
const Choice = mongoose.model('Choice');
const Chapter = mongoose.model('Chapter');
const Story = mongoose.model('Story');
const User = mongoose.model('User');

// express-session
const session = require('express-session');
const sessionOptions = {
	secret: 'super secret',
	resave: true,
	saveUnitialized: true
};

app.use(session(sessionOptions));
//*/

// routes go here
app.get('/', function (req, res) {// list all stories
	//res.send('hello world!');
	Story.find({}, (err, stories) => {
		if (err) {
			console.log(err);
			res.send('uh oh something went wrong');
		}
		//console.log(stories);
		res.render('index', {stories: stories});
	});
});

app.get('/create', function (req, res) {
	res.render('create');
});

app.post('/create', function (req, res) {
	const t = req.body.title;
	const p = req.body.point;
	const c = new Choice({
		action: null,
		effect: p
	});
	const chapt = new Chapter({
		current: c
	});	
	//console.log("t: " + t);
	//console.log("p: " + p);
	if (t.length < 1 || p.length < 1) {
		res.render('create', {error:'please enter something into the text fields'});
	}
	else {
		Story.findOne({title: t}, (err, result) => {
			if (err) {
				console.log(err);
				res.send('uh oh something went wrong');
			}
			if (result) {
				res.render('create', {error: 'story with this title already exists'});
			}
			const s = new Story({
				title: t,
				chapts: [chapt]
			});
			console.log("story created: " + s.title);
			s.save((err) => {
				if (err) {
					console.log(err);
					res.send('uh oh something went wrong');
				}
				res.redirect('/');
			});
		});
	}	
});

app.get('/:slug', function(req, res) {
	Story.findOne({slug: req.params.slug}, (err, sFound) => {
		if (err) {
			console.log(err);
		}
		/* **** chrome makes favicon requests? ==> null error
		console.log("for: " + req.params.slug);
		console.log("Here is the story found:\n" + sFound);
		console.log("does it have a length? " + sFound.length);
		//console.log(sFound.chapts.length);
		//*/
		if (sFound !== null) {
		       if (sFound.chapts.length < 9) {// incomplete story
				// COME BACK AND ACCOUNT FOR WHEN MORE THAN TWO ROUTES
				// MAYBE GO THROUGH EVERY CHAPTER AND HAVE CHOICE FORM???
			       // OR LIST ON MAIN PAGE?
			       res.render('cont', {story: sFound});
			}
			else {// complete story
				res.render('play', {story: sFound});
			}
		}//*/
	});
	//res.render('cont');//, {story: sFound});
});

app.post('/:slug', function (req, res) {
	const s = req.params.slug;
	const cA = new Choice ({
		action: req.body.aOne,
		effect: req.body.eOne
	});
	const cB = new Choice ({
		action: req.body.aTwo,
		effect: req.body.eTwo
	});
	Story.findOne({slug: s}, (err, sFound) => {
		if (err) {
			console.log(err);
		}
		sFound.chapts[0].choiceA = cA;
		sFound.chapts[0].choiceB = cB;
		sFound.markModified('chapts');
		//sFound.markModified('choiceB');
		sFound.save(function(err, modifiedStory) {
			console.log(err, modifiedStory);
		});
		res.redirect(s);	
	});	
	//res.redirect(s);
});

/************** USER AUTHENTICATION, NOT YET DEPLOYED *****************

app.get('/', function(req, res) {	
	res.render('index', {name: req.session.username});
});

app.get('/register', function(req, res) {
	res.render('register');
});

app.post('/register', function(req, res) {
	const pw = req.body.password;
	const name = req.body.username;

	if (pw.length < 8) {
		res.render('register', {error: 'password too short'});
	}
	else {
		User.findOne({username: name}, (err, result) => {
			if (err) {
				console.log(err);
				res.send('an error has occured, please check the server output');
			}
			if (result) {//user exists
				res.render('register', {error: 'user already exists'});
			}
			else {
				//hash, salt and store
				bcrypt.hash(pw, 10, function(err, hash) {
					if (err) {
						console.log(err);
						res.send('an error has occured, please check the server output');
					}
					const u = new User({
						username: name,
						password: hash
					});
					u.save((err) => {
						if (err) {
							console.log(err);
							res.send('an error has occured, please check the server output');
						}
						// start a new session
						req.session.regenerate((err) => {
							if (!err) {
								req.session.username = name;
								res.redirect('/');

							}
							else {
								console.log('error');
								res.send('an error has occured, please see the server logs for more information');
							}
						});
					});
				});
			}
		});
	}

});

app.get('/login', function(req, res) {
	res.render('login');
});

app.post('/login', function(req, res) {
	const name = req.body.username;
	User.findOne({username: name}, (err, user) => {
		if (err) {
			console.log(err);
			res.send('an error has occured, plase check the server output');
		}
		else if (user) {
			bcrypt.compare(req.body.password, user.password, (err, passwordMatch) => {
				if (err) {
					console.log(err);
					res.send('an error has occured, please check the server output');
				}
				if (passwordMatch) {
					if (!err) {
						req.session.username = user.username;
						res.redirect('/');
					}
					else {
						console.log('error');
						res.send('an error has occured, plase check the server output');
					}
				}
			});
		}
		else {
			res.render('login', {error: 'user not found'});
		}		
	});	
});

app.get('/restricted', function (req, res) {
	if (req.session.username) {
		res.render('restricted', {name: req.session.username});
	}
	else {
		res.redirect('/login');
	}
});

app.get('/logout', function(req, res) {
	req.session.destroy(function(err) {
		if (err) {
			console.log('error');
			res.send('an error has occured');
		}
		res.redirect('/');
	});
});



************************************************************************/

// LISTEN ON PORT 3000
app.listen(process.env.PORT || 3000);
console.log("started server on port 3000");
