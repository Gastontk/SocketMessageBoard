// Require MONGOOSE for DB
	var mongoose = require('mongoose');
//connect to mongoose. If DB doesn't exist, it will be created.
	mongoose.connect('mongodb://localhost/basic_mongoose');
// Create schema for both post and comment and associate the two together
	var postSchema = new mongoose.Schema({
		message: {type: String, required: [true, 'Whatcha got to say?'], minlength: 5},		
		name: {type: String, required: [true, 'Gotta have a name...'], minlength: 3},

		comments: [{type: mongoose.Schema.Types.ObjectId, ref: 'Comment'}]},
		{
			timestamps: true
		});



// ----------
      // eggs: {
      //   type: Number,
      //   min: [6, 'Too few eggs'],
      //   max: 12
      // }
 // -------------
	var commentSchema = new mongoose.Schema({
		comment_name: {type: String, required: true, minlength: 5},
		comment_comment: {type: String, required: true, minlength: 10},
		_post: {type: mongoose.Schema.Types.ObjectId, ref: 'Post'}},
		{
			timestamps: true
		});



//set the Schema  in our model as 'User'
	mongoose.model('Post', postSchema);
	mongoose.model('Comment', commentSchema);
// retrieve Schema from Models'
	var Post = mongoose.model('Post');
	var Comment = mongoose.model('Comment');

// Use native promises eventually promises will be required as they are now native to JS
	mongoose.Promise = global.Promise;




//require EXPRESS
	var express = require('express');
//create express app
	var app = express();

// require body parser (parse post data from clients)
	var bodyParser = require('body-parser');
// integrate body-parser into app
	app.use(bodyParser.urlencoded({extended: true}));

// require path
	var path = require('path');
// Setup static folder	
	app.use(express.static(path.join(__dirname, './static')));

// set views folder
	app.set('views', path.join(__dirname, './views'));


//set up ejs view engine ( so you can perform on html before it is sent)
	app.set('view engine', 'ejs');




// ROUTES
// Root

	app.post('/comment/:id', function(req, res){

		console.log('ID is ', req.params.id);
		// var myComment =Comment.find({_id: req.params.id});
		// console.log(myComment);
		Comment.remove({_id: req.params.id}, function(err, result){
			if(err){
				console.log(err)
			}else{
				console.log('Got a result(supposed delete of comment)');
				io.emit('refresh');

			}
			// res.redirect('/');

		})
	})




	app.post('/post/:id', function(req, res){

		console.log('ID is ', req.params.id);
		// var myComment =Comment.find({_id: req.params.id});
		// console.log(myComment);
		Post.remove({_id: req.params.id}, function(err, result){
			if(err){
				console.log(err)
			}else{
				console.log('Got a result(supposed delete of Post)');

			}
			// res.redirect('/');

		})
		Comment.remove({_post: req.params.id}, function(err, result){
				if(err){
					console.log('Error deleting comments associated with deleted post.');
				}else{
					io.emit('refresh');

				}

		})

	})
	app.get('/', function(req, res){
		Post.find({}).sort('-createdAt').populate('comments').exec(function(err, posts) {
			if (err) {
				console.log(err);

			}else{

			}
			res.render('main', {posts: posts});

		});
		

	});
	app.post('/new_message', function(req, res){
		// console.log(req.body);
		var post = new Post({name: req.body.name, message: req.body.message});
		// console.log(post);
		post.save(function(err){
			if(err){
				console.log(err);
				console.log('Post errors are: ',err.errors.message.properties.path);
				var postErr = err;
				Post.find({}).sort('-createdAt').populate('comments').exec(function(err, posts) {
					if (err) {
						console.log(err);

					}else{
						console.log('my check: ', req.body.name);
						res.render('main', {title: 'you have errors!', errors: post.errors, posts: posts, fixName: req.body.name, fixMessage: req.body.message, PostOrCommentError: 'postError'});


					}
				});

			} else {
				console.log('Post', post, 'was saved.');
				res.redirect('/');
				io.emit('new_post_return', {name: post.name, message: post.message, id: post._id});

			}


		})

	})




// Routes that need adjustment for this app. 
// Should show how to add to and retrieve comments on a post
	// Use below to get the comments. just an example route, your routes may look different
	app.get('/posts/:id', function (req, res){
	// the populate method is what grabs all of the comments using their IDs stored in the 
	// comment property array of the post document!
	 Post.findOne({_id: req.params.id})
	 .populate('comments')
	 .exec(function(err, post) {
	 	// console.log('Name ',post.name," ", 'comments: ',post.comments[0]);
	      res.render('post', {post: post});
	        });
	});


	//  just a sample route.  Post request to update a post.
 //  your routes will probably look different.
// For adding a comment to a post.
	 app.post('/posts/:id', function (req, res){
	 	console.log('In add post /posts/:id');
	 	// console.log('req.body is: ', req.body);
	    Post.findOne({_id: req.params.id}, function(err, post){
	    	console.log('found post is ', post.id);
	        // data from form on the front end
	        console.log('Req.body for comment on', post.id, ' is ', req.body);
	        var commentInfo = req.body;
	        var posts = post;
	        var id = post.id;
	        console.log('var posts is ', post)

	        var comment = new Comment(req.body);
	        console.log('req.body is ', req.body)
	        //  set the reference like this:
	        comment._post = post._id;
	        // now save both to the DB

	        comment.save(function(err){
	        	if(err){
	        			console.log('commentInfo is: ', commentInfo)



						Post.find({}).sort('-createdAt').populate('comments').exec(function(err, posts) {
							if (err) {
								console.log(err);

							}else{
								console.log(' comment is ', commentInfo.comment_comment, commentInfo.comment_name);
							res.render('main', {posts: posts, alert: 'Comment not saved', errors: comment.errors, fixCommentName: commentInfo.comment_name, fixCommentComment: commentInfo.comment_comment,  PostOrCommentError: 'commentError', id: id});

							}



						});







	        	} else{
		        	// console.log('pushing ', comment);
		            post.comments.push(comment);
		           	// console.log('after pushing,  post is ', post);
		                post.save(function(err){
		                     if('There was an error: ', err) {
		                          console.log('Error');
		                     } else {
		                          // res.redirect('/');
		                          console.log('comment var is ', comment.id);
		                          io.emit('new_comment_return', {comment: comment.comment_comment, name: comment.comment_name, id: comment.id});
		                     }
		                 });
				}
	         });
	   	 });
	  });




// start server and listen on port#
	var server = app.listen(3000, function(){
		console.log('listening on port 3000');
	});
// this is a new line we're adding AFTER our server listener
// take special note how we're passing the server
// variable. unless we have the server variable, this line will not work!!
	var io = require('socket.io').listen(server);
	io.sockets.on('connection', function(socket){
		console.log('connection sent from client');
		// console.log(socket);

		Post.find({}).sort('-createdAt').populate('comments').exec(function(err, posts) {
			if (err) {
				console.log(err);

			}else{

			}

			   io.to(socket.id).emit('connection_return', {posts: posts});



		});





	})


	









