/* Author: YOUR NAME HERE
 */

$(document).ready(function() {
    var socket = io.connect();

    var fetch = function(key) {
        if (typeof(Storage) !== "undefined")
            return localStorage[key];

        return undefined;
    }

    var store = function(key, value) {
        if (typeof(Storage) !== "undefined")
            localStorage[key] = value;
    }

    var findBySubject = function(subject, parent) {
        parent = parent ? '#' + parent + ' > ' : '';
        return $(parent + '.conversation').filter(function(index) {
            return $(this).find('.subject').text() === subject;
        });
    }

    var moveTo = function(subject, parent) {
        findBySubject(subject).prependTo('#' + parent);
        store(subject, parent);
    }

    var bumpOrCreate = function(subject, parent) {
        parent = parent || 'preview';

        // bampu pantsu
        if (findBySubject(subject).length) {
            findBySubject(subject, parent).prependTo('#' + parent);
            findBySubject(subject, 'preview').prependTo('#preview');
            findBySubject(subject, 'hidden').prependTo('#hidden');
            return;
        }

        // build new conversation
        $('#' + parent).prepend(conversationTemplate({ subject: subject }));
        var conversation = findBySubject(subject);
        moveTo(subject, fetch(subject) || parent);

        // setup new conversation's control bar
        conversation.find('.pin').bind('click', function() { moveTo(subject, 'pinned'); return false; });
        conversation.find('.hide').bind('click', function() { moveTo(subject, 'hidden'); return false; });
        conversation.find('.unpin').bind('click', function() { moveTo(subject, 'preview'); return false; });
        conversation.find('.unhide').bind('click', function() { moveTo(subject, 'preview'); return false; });

        conversation.find('.message').keyup(function(event) {
            if (event.keyCode == 13)
                conversation.find('.say').click();
        });

        conversation.find('.say').bind('click', function() {
            socket.emit('say', {
                message: conversation.find('.message').val(),
                subject: subject
            });
            conversation.find('.message').val('');
        });
    }

    var conversationTemplate = Handlebars.compile($("#conversation-template").html());
    var messageTemplate = Handlebars.compile($("#message-template").html());

    $('#name').val(fetch('name') || '（　｀ー´）');
    socket.emit('rename', { newName: $('#name').val() });

    $('#name').bind('blur', function() {
        socket.emit('rename', { newName: $('#name').val() });
        store('name', $('#name').val());
    });

    $('#start-conversation').bind('click', function() {
        bumpOrCreate($('#subject').val(), 'pinned');
        $('#subject').val('');
    });

    socket.on('said', function(data) {
        bumpOrCreate(data.subject);

        var conversation = findBySubject(data.subject);
        conversation.find('ul').prepend(messageTemplate(data));
    });
});