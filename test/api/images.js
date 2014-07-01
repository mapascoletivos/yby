/*
 * Module dependencies.
 */

var 
	fs = require('fs'),
	should = require('should'),
	request = require('supertest'),
	app = require('../../web'),
	mongoose = require('mongoose'),
	Image = mongoose.model('Image'),
	Factory = require('../../lib/factory'),
	messages = require('../../lib/messages'),
	clear = require('../../lib/clear');

var
	apiPrefix = '/api/v1',
	imageFixturePath = __dirname + '/../../fixtures/ecolab.png',
	uploadedImagesPath = __dirname + '/../../public/uploads/images',
	userAccessToken,
	userModel;

/*
 * Helper function to log in a user
 */

function login(user, callback){
	request(app)
		.post(apiPrefix + '/access_token/local')
		.send({ email: user.email, password: user.password })
		.end(onResponse);

	function onResponse(err, res) {
		should.not.exist(err);
		should(res).have.property('status', 200);
		should.exist(res.body.accessToken);
		userAccessToken = 'Bearer '+ res.body.accessToken;
		callback();
	}
}



describe('Images API', function(){


	before(function (done) {
		mongoose.connection.on('open', function(){
			clear.all(function(err){
				should.not.exist(err);
				Factory.create('User', function(user){
					userModel = user;
					login(userModel, done);
				});			
			});
		});
	})


	after(function (done) {
		clear.all(function(err){
			should.not.exist(err);
			done(err);
		});
	})

	/**
	 * Create Image
	 */
	describe('POST /images', function(){
		context('not logged in', function(){
			it('should return forbidden', function (done) {
				request(app)
					.post(apiPrefix + '/images')
					.expect('Content-Type', /json/)
					.expect(403)
					.end(done)
			});
		});	

		context('logged in', function(){
			it('valid image creation request', function (done) {
				request(app)
					.post(apiPrefix + '/images')
					.set('Authorization', userAccessToken)
					.attach('attachment[file]', imageFixturePath) // attach like SirTrevo does
					.expect('Content-Type', /json/)
					.expect(200)
					.end(onResponse);

					function onResponse(err, res) {

						should.not.exist(err);
						should.exist(res.body.file.name);

						// thumb image file is saved properly
						var thumbFilename = uploadedImagesPath + '/thumb_' + res.body.file.name;
						fs.existsSync(thumbFilename).should.be.true;
						var thumbSize = fs.statSync(thumbFilename).size; 
						thumbSize.should.be.above(0);

						// mini image file is saved properly
						var miniFilename = uploadedImagesPath + '/mini_' + res.body.file.name;
						fs.existsSync(miniFilename).should.be.true;
						var miniSize = fs.statSync(miniFilename).size; 
						miniSize.should.be.above(thumbSize);

						// default image file is saved properly
						var defaultFilename = uploadedImagesPath + '/default_' + res.body.file.name;
						fs.existsSync(defaultFilename).should.be.true;
						var defaultSize = fs.statSync(defaultFilename).size; 
						defaultSize.should.be.above(miniSize);

						// large image file is saved properly
						var largeFilename = uploadedImagesPath + '/large_' + res.body.file.name;
						fs.existsSync(largeFilename).should.be.true;
						var largeSize = fs.statSync(largeFilename).size; 
						largeSize.should.be.above(defaultSize);

						done();
					}
			});

			it('missing attachment');
			it('invalid image');
		});	
	});	

	/**
	 * Delete Image
	 */
	describe('DEL /images', function(){
		context('not logged in', function(){
			it('should return forbidden', function (done) {
				request(app)
					.del(apiPrefix + '/images')
					.expect('Content-Type', /json/)
					.expect(403)
					.end(onResponse)

				function onResponse(err, res) {
					should(messages.hasValidMessages(res.body)).be.true;
					done(err);
				}
			});
		});	
	});	
	
});