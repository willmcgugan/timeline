function Watcher(url, on_instruction)
{
	var self = this;
	var ws = null;
	var watch = [];

	var connect = function()
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

	var onmessage = function(event)
	{
		var instruction = JSON.parse(event.data);
		on_instruction(instruction);
	}

	var addWatch = function(paths)
	{
		var watch_json = JSON.stringify(paths);
		self.ws.send(watch_json);
	}
	return self;
}