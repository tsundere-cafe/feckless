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
    var nameTemplate = Handlebars.compile($("#name-template").html());
    var channelTemplate = Handlebars.compile($("#channel-name-template").html());


    var quotes = [''];
    var channel = decodeURIComponent(window.location.pathname).substring(1).replace(/-/g, ' ');
    socket.emit('subscribe', channel);
    if (channel)
        $('#channel-name').html(channelTemplate({ channel: channel }));
    else
        $('#channel-name').html(quotes[Math.floor(Math.random() * quotes.length)])

    $('#name').val(fetch('name') || '（　｀ー´）');
    socket.emit('rename', { newName: $('#name').val() });


    $('#instructions-body').hide();

    $('#name').bind('blur', function() {
        socket.emit('rename', { newName: $('#name').val() });
        store('name', $('#name').val());
    });

    $('#start-conversation').bind('click', function() {
        bumpOrCreate($('#subject').val(), 'pinned');
        moveTo($('#subject').val(), 'pinned');
        $('#subject').val('');
    });

    $('#show-instructions-button').bind('click', function() {
        $('#instructions-body').toggle();
        return false;
    });

    socket.on('said', function(data) {
        bumpOrCreate(data.subject);

        // format time
        var d = new Date(data.time);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
        data.time = d.getDate() + ' ' + months[d.getMonth()] + ', ' + d.getFullYear() + ' ' +
                    d.getHours() + ':' +
                    (d.getMinutes() < 10 ? '0' : '') + d.getMinutes() + ':' +
                    (d.getSeconds() < 10 ? '0' : '') + d.getSeconds();

        var conversation = findBySubject(data.subject);
        conversation.find('ul').prepend(messageTemplate(data));

        var lastname = '';
        var lasttrip = '';
        conversation.find('.name-block').each(function() {
            if ($(this).find('.name').html() == lastname && $(this).find('.trip').html() == lasttrip)
                $(this).hide();

            lastname = $(this).find('.name').html();
            lasttrip = $(this).find('.trip').html();
        });
    });

    socket.on('members', function(data) {
        $('#members > li').remove();
        for (var i = 0; i < data.length; i++)
            $('#members').append(nameTemplate({ trip: data[i] }));
    })
});