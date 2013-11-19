var express = require('express');
var emitter = require('events').EventEmitter;
var form    = require('connect-form');
var fs      = require('fs');

var app    = express();
var events = new emitter();

var statPath = __dirname + '/public/static';
app.configure(function(){
	app.use(express.static(statPath));
	app.use(express.static(__dirname + '/public/photos'));
});

// main entry point for site
app.get('/', function(req, res){
	events.emit('servePage', res);
});

app.post('/', function(req, res, next){

	// connect-form adds the req.form object
	// we can (optionally) define onComplete, passing
	// the exception (if any) fields parsed, and files parsed
	req.form.complete(function(err, fields, files){
		if (err) {
			next(err);
		} else {
			console.log('\nuploaded %s to %s',
				files.image.filename,
				files.image.path
			);
		res.redirect('back');
		}
	});

	// We can add listeners for several form
	// events such as "progress"
	req.form.on('progress', function(bytesReceived, bytesExpected){
		var percent = (bytesReceived / bytesExpected * 100) | 0;
		process.stdout.write('Uploading: %' + percent + '\r');
	});
});

// serve up the content
var serveImage = function(res, filename){
	console.log('serving image');
}

var serveLanding = function(res){
	var photoFrame = fs
		.readFileSync(__dirname + '/public/frame.html')
		.toString();
	var page = fs
		.readFileSync(__dirname + '/public/index.html')
		.toString();

	// TODO process

	// TODO, retrieve data from db
	var photos = [{src:'test.jpg', desc:'kitty', markup: ''}];
	for(var i = photos.length; i--;){
		var photo = photos[i];
		photo.markup = photoFrame
			.replace('{{img-src}}', photo.src)
			.replace('{{img-style}}', '');
	}

	var photoMarkup = '';
	for(var i = photos.length; i--; photoMarkup += photos[i].markup);
	page = page.replace('{{photos}}', photoMarkup);

	res.setHeader('Content-Type', 'text/html');
	res.setHeader('Content-Length', page.length);
	res.send(page);
};

events.on('servePage', serveLanding);

app.listen(3000);
