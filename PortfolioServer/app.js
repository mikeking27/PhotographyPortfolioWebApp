var express = require('express');
var emitter = require('events').EventEmitter;
var mongo   = require('mongodb').MongoClient;
var fs      = require('fs');

var app    = express();
var events = new emitter();

var statPath  = __dirname + '/public/static';
var photoPath = __dirname + '/public/photos';
var mongoUrl  = 'mongodb://photos:Password01@ds031088.mongolab.com:31088/photoportfoliodb';

app.use(express.bodyParser());
app.configure(function(){
	app.use(express.static(statPath));
	app.use(express.static(photoPath));
});

mongo.connect(mongoUrl, function(err, db){
var collection = db.collection('image_info');


if(err) return console.dir(err);
console.log('Connected to ' + mongoUrl);

// main entry point for site
app.get('/', function(req, res){
	events.emit('servePage', res);
});

app.post('/UploadPhoto', function(req, res, next){
	// the uploaded file can be found as `req.files.image` and the
	// title field as `req.body.title`
 	console.log('caught post');

	// copy the photo to save it
	//events.emit('storePhoto', req.body, res, 'servePage');

	for(var k in req.files){
		var image = req.files[k];
		var name = (image.path.split('/')).pop();

		// cool, we got the temp name
		console.log('NAME: ', image.name.length);
		if(image.name.length > 0){
			var photo = {
				src: ''
			};

			// decorate the photo object with form data
			for(var attr in req.body){
				photo[attr] = req.body[attr];
			}
			photo.src  = name; // retain the location
			photo.name = image.name.split('.')[0] || '';

			// copy the file
			fs.createReadStream(image.path)
			.pipe(fs.createWriteStream(photoPath +'/'+ name));

			events.emit('storePhoto', photo);
		}
	}
	events.emit('servePage', res); 
});

app.post('/UpdatePhoto', function(req, res, next){
	events.emit('updatePhoto', req.body, res, 'servePage');
});

app.post('/DeletePhoto', function(req, res, next){
	events.emit('deletePhoto', req.body, res, 'servePage');
});

// serve up the content
var serveImage = function(res, filename){
	console.log('serving image');
}

var serveLanding = function(res){
	// TODO, retrieve data from db
	events.emit('getAllPhotos', {}, res, 'assembleAndTransmit');
};

var assembleAndTransmit = function(photos, res){
	var photoFrame = fs
		.readFileSync(__dirname + '/public/frame.html')
		.toString();
	var page = fs
		.readFileSync(__dirname + '/public/index.html')
		.toString();

	console.log('photos: ' + photos.length);
	for(var i = photos.length; i--;){
		var photo = photos[i];
		photo.markup = photoFrame
			.replace('{{img-src}}', photo.src)
			.replace('{{img-style}}', 'width:'+photo.width+'px;height'+photo.height+'px')
			.replace('{{img-desc}}', photo.description);	
	}

	var photoMarkup = '';
	for(var i = photos.length; i--; photoMarkup += photos[i].markup);
	var markup = '', lines = page.split('\n');
	for(var i = 0; i < lines.length; i++)
		markup += lines[i].replace('{{photos}}', photoMarkup) + '\n';

	res.setHeader('Content-Type', 'text/html');
	res.setHeader('Content-Length', markup.length);
	res.send(markup);
};

var storeData = function(data){
	// TODO push into database
	console.log('Storing data... ' + JSON.stringify(data));
	db.collection('image_info').save(data, {safe:true}, function(err, data){
		console.log('Saved!');
	});
};

var getPhoto = function(query, res, cbEvent){
	var cursor = db.collection('image_info').find(query);
	var photos = [];
	cursor.each(function(err,doc){
		if(err){
			console.log('Error: ' + err);
			return;
		}
		if(!doc){
			console.log('Emitting ' + cbEvent);
			events.emit(cbEvent, photos, res);
			return;
		}
		console.log('Result: ' + JSON.stringify(doc));
		doc.markup = '';
		photos.push(doc);
	});
};

var updatePhoto = function(data, res, cbEvent){
	db.collection('image_info').update(
		{src:data.src}, 
		{$set: data},
		function(){
			events.emit(cbEvent, res);
		}
	);
};

var deletePhoto = function(data, res, cbEvent){
	db.collection('image_info').remove(
		data,
		function(){
			events.emit(cbEvent, res);
		}
	);
		
};

events.on('servePage', serveLanding);
events.on('assembleAndTransmit', assembleAndTransmit);
events.on('storePhoto', storeData);
events.on('updatePhoto', updatePhoto);
events.on('getAllPhotos', getPhoto);
events.on('deletePhoto', deletePhoto);

app.listen(3000);

});
