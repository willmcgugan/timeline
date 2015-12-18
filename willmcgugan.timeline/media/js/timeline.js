function Watcher(url, on_instruction)
{
	var self = this;
	var ws = null;
	var watch = [];
	var checker_id = null;

	self.connect = function()
	{
		var ws = new WebSocket(url);
		self.ws = ws;
		ws.onopen = function(event)
		{
			
		}
		ws.onclose = function(event)
		{
			self.ws = null;
		}
		ws.onmessage = function(event)
		{
			self.onmessage(event)
		}
		if (checker_id)
		{
			clearInterval(checker_id);
		}
		/* Check for drop-outs periodically, so we can reconnect */
		checker_id = setInterval(self.check_connect, 2000);
	}

	self.onmessage = function(event)
	{
		var instructions = JSON.parse(event.data);
		on_instructions(instructions);
	}

	self.check_connect = function()
	{
		if (!self.ws)
		{
			self.connect()
		}
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
	$(events.reverse()).each(function(i, event_update){
		var $event = $(event_update.html);
		var $existing_event = $('#event-' + event_update.id);
		if (!$existing_event.length)
		{
			$event.prependTo($timeline_container).addClass('new-event');
			setTimeout(function(){$event.removeClass('new-event')}, 0);
		}
	});
}

function update_stream()
{
	rpc.call(
		'events.get_updates',
		{'time': stream_time, 'events': events},
		function(result){
			update_events(result.time, result.events);
		});
}

$(function(){
	var $body = $('body');
	var data = $body.data();
	events = data.events;
	stream = data.stream;
	stream_time = data.time;

	watcher = new Watcher(data.watcherurl, on_instructions);
	watcher.connect()

	rpc = new JSONRPC(data.rpc_url);
	
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