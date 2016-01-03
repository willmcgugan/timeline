
function Watcher(url, on_instructions)
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


(function($) {
    $.fn.inthingStream = function(config) {
		var self = this;
		var $stream = $(this);
		var $events_container = $stream.find('.events-container')
		var $new_events = $stream.find('.new-events');
		var rpc = new JSONRPC(config.rpc_url);

		var stream_id = config.stream_id;
		var $subscribe_button = $('.subscribe-button[data-stream=' + stream_id + ']');
		$subscribe_button.find('input').click(function(event){
			if ($subscribe_button.hasClass('unsubscribed'))
			{
				rpc.call(
					'stream.subscribe',
					{'stream': stream_id},
					function(result){
						$subscribe_button.removeClass('unsubscribed').addClass('subscribed');
					});
			}
			else
			{
				rpc.call(
					'stream.unsubscribe',
					{'stream': stream_id},
					function(result){
						$subscribe_button.removeClass('subscribed').addClass('unsubscribed');
					});
			}
		});

		self.event_source = config.source;
		self.time = config.time;

		self.event_stack = [];

		$new_events.click(function(e){
			$("html, body").animate({ scrollTop: 0 }, "fast", function(){
				self.check_updates();
			});
		});

		self.update_events = function(time, events)
		{
			self.time = time;
			$(events).each(function(i, event_update){
				self.add_event(event_update);
			});
			self.check_updates();
		}

		self.add_event = function(event_update)
		{
			if($('#event-' + event_update.id).length)
			{
				return;
			}
			for(var i=0; i<self.event_stack.length;i++)
			{
				if (event_update.id == self.event_stack[i].id)
				{
					return;
				}
			}
			self.event_stack.push(event_update);
		}


		self.check_updates = function()
		{
			if(!self.event_stack.length)
			{
				return;
			}

			$window = $(window);
			var scroll_y = $window.scrollTop();

			if (scroll_y > 100)
			{
				$new_events.addClass('pending-events');
				$new_events.find('.count').text(self.event_stack.length);

				return;
			}
			$new_events.removeClass('pending-events');

			$(self.event_stack).each(function(i, event_update){
				var $existing_event = $('#event-' + event_update.id);
				if (!$existing_event.length)
				{
					$events_container.prepend(event_update.html);
					var $existing_event = $('#event-' + event_update.id);
					highlight_code($existing_event.find('pre'));
					$existing_event.addClass('new-event');
				}
	            self.event_stack = [];
			});
			setTimeout(function(){
				$('.event').removeClass('new-event');
			}, 50);

		}

		self.check_append_events = function()
		{
			var $more_events = $stream.find('.more-events');

			if(!$more_events.length || $more_events.hasClass('loading'))
			{
				return;
			}

			var $events = $events_container.find('.event');
			var $last_event = $($events[$events.length - 1]);
			var event_data = $last_event.data();
			last_event_time = event_data.time;

			$more_events.addClass('loading');

			rpc.call(
				'events.get_updates',
				{'time': last_event_time, 'events': self.event_source, 'new': false},
				function(result){
					$more_events.removeClass('loading');
					if(!result.events.length)
					{
						$more_events.remove();
						return;
					}
					$(result.events).each(function(i, event){
						if(!$('#event-' + result.uuid).length)
						{
							$more_events.before(event.html);
						}
					});
				});
		}

	 	self.update = function()
		{
			rpc.call(
				'events.get_updates',
				{'time': self.time, 'events': self.event_source},
				function(result){
					self.update_events(result.time, result.events);
				});
		}


		var on_instructions = function(instructions)
		{
			$(instructions).each(function(i, instruction){
				var action = instruction.action;
				if(action=='update-stream')
				{
					self.update();
				}
			});
		}

		$(window).scroll(function(e){
			var $more_events = $('.more-events');
			if(!$more_events.length)
			{
				return;
			}
			var window_height = $(window).height();
			var more_y = $more_events.offset().top;
			var scroll_y = $(window).scrollTop();

			if (more_y - (scroll_y + window_height) <= 0)
			{
				self.check_append_events();
			}
		});

		self.watcher = new Watcher(config.watcherurl, on_instructions);
		self.watcher.connect();
	}
})(jQuery);

$(function(){
    var config = $('body').data();
    rpc = new JSONRPC(config.rpc_url);
});


$(function(){
    $('.moya-comment-form-editor').each(function(i, el){
        var $form = $(this);
        var $edit = $form.find('textarea');
        var $preview = $form.find('.preview-comment');

        $edit.change(function(){
            var markup = $form.data('markup');
            var comment = $form.find('textarea').val();
            rpc.call(
                'preview_comment',
                {comment:comment, markup:markup},
                function(result){
                    $preview.html(result.html);
                    highlight_code($preview);
                }
            );
        });

    });
});

function highlight_code($el)
{
    $el.find('code').each(function(i, el){
        var $code = $(this);
        var language_spec = $code.attr('class');
        if (language_spec)
        {
            var language = language_spec.split('-')[1];
            if (language)
            {
                $code.attr('class', language);
                hljs.highlightBlock($code[0]);
            }
        }
        else
        {
            /*$code.addClass('hljs');*/
        }
    });
}

$(function(){
    $('body').addClass('loaded');
    highlight_code($('pre'));
});

$(function () {
  $('[data-toggle="tooltip"]').tooltip();
});

$(function(){

    $('.window-link').click(function(e){
        e.preventDefault()
        var $link = $(this);
        var href = $link.attr('href');
        var title = $link.attr('title');
        window.open(href, title, "width=640, height=480");
    });

});


