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

$(function(){
	var $body = $('body');
	var data = $body.data();
	var watcher_url = data.watcherurl;

	watcher = new Watcher(watcher_url, on_instruction);
	watcher.connect()

});