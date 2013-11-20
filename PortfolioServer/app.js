var express = require('express');
var emitter = require('events').EventEmitter;
var fs      = require('fs');

var app    = express();
var events = new emitter();

var statPath  = __dirname + '/public/static';
var photoPath = __dirname + '/public/photos';

app.use(express.bodyParser());
app.configure(function(){
	app.use(express.static(statPath));
	app.use(express.static(photoPath));
});

// main entry point for site
app.get('/', function(req, res){
	events.emit('servePage', res);
});

app.post('/', function(req, res, next){
	// the uploaded file can be found as `req.files.image` and the
	// title field as `req.body.title`
 	console.log('caught post');

	// copy the photo to save it
	var images = req.files;
	console.log(images);
	for(var k in images){
		var image = images[k];
		var names = image.path.split('/');
		var name = names[names.length - 1];
		if(name){
			fs.createReadStream(image.path)
			.pipe(fs.createWriteStream(photoPath +'/'+ name));
		}
	}
	events.emit('servePage', res);
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
