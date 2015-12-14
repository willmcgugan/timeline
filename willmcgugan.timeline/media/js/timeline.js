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
		var instruction = JSON.parse(event.data);
		on_instruction(instruction);
	}

	return self;
}

function on_instruction(instruction)
{
	console.log(instruction)
}

function update_events(time, events)
{
	stream_time = time;
	var $timeline_container = $('.timeline-container');
	$(events).each(function(i, event){
		var $event = $(event.html);
		$event.appendTo($timeline_container).addClass('new-event');
		setTimeout(function(){$event.removeClass('new-event')}, 100);
	});
}

function update_stream()
{
	rpc.call(
		'stream.get_updates',
		{'time': 0, 'stream': stream},
		function(result){
			update_events(result.time, result.events);
		});
}

$(function(){
	var $body = $('body');
	var data = $body.data();
	stream = data.stream;
	stream_time = data.time;

	watcher = new Watcher(data.watcherurl, on_instruction);
	watcher.connect()

	rpc = new JSONRPC(data.rpc_url);
	update_stream();
});