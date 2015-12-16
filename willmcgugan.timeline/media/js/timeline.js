function Watcher(url, on_instruction)
{
	var self = this;
	var ws = null;
	var watch = [];

	self.connect = function()
	{
		var ws = new WebSocket(url);
		ws.onopen = function(event)
		{
			self.ws = ws;
		}
		ws.onclose = function(event)
		{
			self.ws = null;
		}
		ws.onmessage = function(event)
		{
			self.onmessage(event)
		}
	}

	self.onmessage = function(event)
	{
		var instructions = JSON.parse(event.data);
		on_instructions(instructions);
	}

	return self;
}

function on_instructions(instructions)
{
	$(instructions).each(function(i, instruction){
		var action = instruction.action;
		if(action=='update-stream')
		{
			update_stream();
		}
	});
}

function update_events(time, events)
{
	stream_time = time;
	var $timeline_container = $('.timeline-container');
	$(events).each(function(i, event){
		var $event = $(event.html);
		var $existing_event = $('#event-' + event.id);
		if (!$existing_event.length)
		{
			emojione.shortnameToImage(input);
			$event.prependTo($timeline_container).addClass('new-event');
			setTimeout(function(){$event.removeClass('new-event')}, 10);
		}
	});
}

function update_stream()
{
	rpc.call(
		'stream.get_updates',
		{'time': stream_time, 'stream': stream},
		function(result){
			update_events(result.time, result.events);
		});
}

$(function(){
	var $body = $('body');
	var data = $body.data();
	stream = data.stream;
	stream_time = data.time;

	watcher = new Watcher(data.watcherurl, on_instructions);
	watcher.connect()

	rpc = new JSONRPC(data.rpc_url);
	update_stream();

	var $subscribe_button = $('.subscribe-button');

	$('.subscribe-button').click(function(event){
		if ($subscribe_button.hasClass('unsubscribed'))
		{
			rpc.call(
				'stream.subscribe',
				{'stream': stream},
				function(result){
					$subscribe_button.removeClass('unsubscribed').addClass('subscribed');
				});
		}
		else
		{
			rpc.call(
				'stream.unsubscribe',
				{'stream': stream},
				function(result){
					$subscribe_button.removeClass('subscribed').addClass('unsubscribed');
				});
		}
	});

});