//setup Dependencies
var connect = require('connect')
    , express = require('express')
    , io = require('socket.io')
    , port = (process.env.PORT || 8081);

//Setup Express
var server = express.createServer();
server.configure(function(){
    server.set('views', __dirname + '/views');
    server.set('view options', { layout: false });
    server.use(connect.bodyParser());
    server.use(express.cookieParser());
    server.use(express.session({ secret: "shhhhhhhhh!"}));
    server.use(connect.static(__dirname + '/static'));
    server.use(server.router);
});

var uuid = 0;

//setup the errors
server.error(function(err, req, res, next){
    if (err instanceof NotFound) {
        res.render('404.jade', { locals: {
            title : '404 - Not Found'
            ,description: ''
            ,author: ''
            ,analyticssiteid: 'XXXXXXX'
        },status: 404 });
    } else {
        res.render('500.jade', { locals: {
            title : 'The Server Encountered an Error'
            ,description: ''
            ,author: ''
            ,analyticssiteid: 'XXXXXXX'
            ,error: err
        },status: 500 });
    }
});
server.listen( port);

//Setup Socket.IO
var io = io.listen(server);
io.sockets.on('connection', function(socket){
    console.log('Client Connected');

    // everyone starts off anon
    socket.username = 'anon';
    socket.broadcast.emit('join', { name: 'anon' });
    socket.emit('join', { name: 'anon' });

    socket.on('rename', function(data) {
        data.name = socket.username;
        socket.username = data.newName;

        socket.broadcast.emit('rename', data);
        socket.emit('rename', data);
    });

    socket.on('start_conversation', function(data) {
        data.name = socket.username;
        data.id = uuid++;
        socket.broadcast.emit('start_conversation', data);
        socket.emit('start_conversation', data);
    });

    socket.on('say', function(data){
        data.name = socket.username;
        socket.broadcast.emit('she_said', data);
        socket.emit('i_said', data);
    });

    socket.on('disconnect', function(){
        socket.broadcast.emit('part', { name: socket.username });
        console.log('Client Disconnected.');
    });
});


///////////////////////////////////////////
//              Routes                   //
///////////////////////////////////////////

/////// ADD ALL YOUR ROUTES HERE  /////////

server.get('/*', function(req,res){
    res.render('index.jade', {
        locals : {
            title : 'Your Page Title'
            ,description: 'Your Page Description'
            ,author: 'Your Name'
            ,analyticssiteid: 'XXXXXXX'
        }
    });
});

//A Route for Creating a 500 Error (Useful to keep around)
server.get('/500', function(req, res){
    throw new Error('This is a 500 Error');
});

//The 404 Route (ALWAYS Keep this as the last route)
server.get('/*', function(req, res){
    throw new NotFound;
});

function NotFound(msg){
    this.name = 'NotFound';
    Error.call(this, msg);
    Error.captureStackTrace(this, arguments.callee);
}


console.log('Listening on http://0.0.0.0:' + port );
