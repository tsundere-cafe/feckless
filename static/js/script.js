/* Author: YOUR NAME HERE
 */


$(document).ready(function() {
    var socket = io.connect();

    window.say = function(id) {
        console.log(id);
        socket.emit('say', {
            message: $('#conversation-' + id + ' > .message').val(),
            id: id
        });
    }

    var conversationTemplate = Handlebars.compile($("#conversation-template").html());
    var messageTemplate = Handlebars.compile($("#message-template").html());
    var selfMessageTemplate = Handlebars.compile($("#self-message-template").html());

    $('#start-conversation').bind('click', function() {
        socket.emit('start_conversation', { subject: $('#subject').val() });
        $('#subject').val('');
    });

    socket.on('start_conversation', function(data) {
        console.log("conversation starting: " + data.subject);
        $('#conversations').append(conversationTemplate(data));
        // it'd be cool if we could query the say button out of here and bind the say function directly to it
    });

    socket.on('i_said', function(data) {
        $('#conversation-' + data.id + ' ul').append(selfMessageTemplate(data));
    });

    socket.on('she_said', function(data) {
        $('#conversation-' + data.id + ' ul').append(messageTemplate(data));
    });
});