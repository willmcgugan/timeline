function link_hashtags($container)
{
    $container.find('p.description').each(function(i, el){

        function do_highlight(el)
        {
            var count = el.childNodes.length;
            for (i=0; i<count; i++)
            {
                var node = el.childNodes[i];
                if(node.nodeType != 3)
                {
                    if(node.nodeName != 'A')
                    {
                        do_highlight(node);
                    }
                }
                else
                {
                    var new_text = node.textContent.replace(
                        /\#(\w+)/g,
                        function(match) {
                            var tag = match.substr(1);
                            return '<a class="hashtag" href="/tag/' + tag + '/">#' + tag + '</a>';
                        }
                    );
                    var replace_node = document.createElement('span');
                    replace_node.innerHTML = new_text
                    node.parentNode.insertBefore(replace_node, node);
                    node.parentNode.removeChild(node);
                }
            }
        }
        do_highlight(el);
    });

}


function update_times($el, recent_only)
{
    $el.each(function(i, el){

        var units = [
            [60 * 60 * 24, 'day', 'days'],
            [60 * 60, 'hour', 'hours'],
            [60, 'minute', 'minutes'],
            [1, 'second', 'seconds'],
        ];

        var event_time = $(el).data('time');
        var T = (new Date).getTime() / 1000.0;
        var time_passed = Math.floor(T - event_time);

        /*
        If recent_only is true, then skip times greater than a day
        */
        if(recent_only && time_passed > 60 * 60 * 24)
        {
            return false;
        }

        var time_string = 'just now';
        for (i=0; i<units.length; i++)
        {
            var divisable = units[i][0];
            var unit = Math.floor(time_passed / divisable);
            if(unit)
            {
                time_string = unit + " " + units[i][unit <= 1 ? 1 : 2] + ' ago';
                break;
            }
        }
        $(el).text(time_string);
    });
}

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


streams = {};
(function($) {
    $.fn.inthingStream = function(config) {
		var self = this;
		var $stream = $(this);

		var $events_container = $stream.find('.events-container')
		var $new_events = $stream.find('.new-events');
        var stream_end = false;
        var request_index = 0;
		var stream_id = config.stream_id;
        streams[stream_id] = self;

		self.event_source = config.source;
		self.event_stack = [];
		self.filter_types = [];
        self.filter_streams = [];
        self.filter_hashtags = '';

        var $document = $(document);
		$document.on('change', '#filter-types input.event-type', function(){
			var filter = [];
			$('#filter-types input.event-type:checked').each(function(e, el){
				filter.push($(el).data('filter'));
			});
			self.filter_types = filter;
			self.refresh();
		});

        $document.on('change', '.switch-cards input', function(e){
            if($(this).is(':checked'))
            {
                $('#list-stream-cards').addClass('show');
            }
            else
            {
                $('#list-stream-cards').removeClass('show');
            }
        });

        var $filter_streams = $('#filter-streams');
        $filter_streams.on('change', 'input.stream-id-filter', function(){
            var filter = [];
            $filter_streams.find(':checked').each(function(e, el){
                var stream_pk = $(el).data('filter');
                if(stream_pk)
                {
                    filter.push(stream_pk);
                }
            });
            self.filter_streams = filter;
            self.refresh();
        });
        var $filter_hashtags = $('#filter-hashtags');
        $document.on('keyup', '#filter-hashtags input.filter-hashtags', function(){
            var filter_hashtags = $(this).val();
            if(filter_hashtags != self.filter_hashtags)
            {
                self.filter_hashtags = filter_hashtags;
                self.refresh();
            }
        });

		$new_events.click(function(e){
            var event_top = $('.events-container').offset().top - 90;
			$("html, body").animate({ scrollTop: event_top }, "fast", function(){
				self.check_updates();
			});
		});

        self.query_events = function(query, on_result)
        {
            var params = {
                'source': self.event_source,
                'filter_types': self.filter_types,
                'filter_streams': self.filter_streams,
                'filter_hashtags': self.filter_hashtags
            };
            var params = jQuery.extend(params, query);
            request_index += 1;
            params.request_index = request_index;
            rpc.call(
                'events.get_updates',
                params,
                function(result)
                {
                    if (result.request_index == request_index)
                    {
                        on_result(result);
                    }
                }
            );
        }

        self.on_new_image = function(uuid)
        {
            rpc.call('stream.set_image',
            {
                stream: stream_id,
                image_uuid: uuid
            }, function(result)
            {
                $('.stream-info .stream-image').html($(result.html.side).find('.stream-image'));
            });
        }

		self.update_events = function(events, reset)
		{
            if(reset)
            {
                $stream.find('.event').remove();
            }
			$(events.reverse()).each(function(i, event_update){
				self.add_event(event_update);
			});
			self.check_updates(reset);
		}

		self.add_event = function(event_update)
		{
			if($('#event-' + event_update.id).length)
			{
				return;
			}
			for(var i=0; i < self.event_stack.length; i++)
			{
				if (event_update.id == self.event_stack[i].id)
				{
					return;
				}
			}
			self.event_stack.push(event_update);
		}

		self.refresh = function()
		{
			$stream.find('.event').addClass('fade-event');
			self.event_stack = [];
			self.reset();
		}

		self.check_updates = function(reset)
		{
			if(!self.event_stack.length)
			{
				return;
			}

            if(!reset)
            {
    			var $window = $(window);
    			var scroll_y = $window.scrollTop();
                var container_y = $('.events-container').offset().top;
                var window_height = $(window).height();

    			if (container_y + 100 < scroll_y)
    			{
    				$new_events.addClass('pending-events');
    				$new_events.find('.count').text(self.event_stack.length);
    				return;
    			}
            }
			$new_events.removeClass('pending-events');

			$(self.event_stack).each(function(i, event_update){
				var $existing_event = $('#event-' + event_update.id);
				if (!$existing_event.length)
				{
					$events_container.prepend(event_update.html);
					var $existing_event = $('#event-' + event_update.id);
					$existing_event.addClass('new-event');
                    bind_event($existing_event);
				}
	            self.event_stack = [];
			});
    
		}

		self.check_append_events = function()
		{
			var $more_events = $stream.find('.more-events');
            if(stream_end)
            {
                return;
            }

			var $events = $stream.find('.event');

			if($events.length)
			{
				var $last_event = $($events[$events.length - 1]);
				var event_data = $last_event.data();
                var last_event_order = event_data.order;
			}
			else
			{
                var last_event_order = 0;
			}

			$more_events.addClass('loading');

			self.query_events(
				{
                    'order': last_event_order,
					'new': false
				},
				function(result){

					$more_events.removeClass('loading');
					if(!result.events.length)
					{
                        stream_end = true;
						return;
					}
					$(result.events).each(function(i, event){
						if(!$('#event-' + result.id).length)
						{
							$events_container.append($(event.html));
							bind_event($('#event-' + event.id))
						}
					});
				});
		}

        var bind_event = function($event)
        {
            var $event_content = $event.find('.event-content');
            if($event_content.length)
	        {
	            if($event_content[0].scrollHeight > 300)
	            {
	            	$event.find('.expand-card').addClass('expandable');
	            }
	            $event.find('.expand-card').click(function(e){
	            	e.preventDefault();
	            	$event_content.toggleClass('expanded');
	            	if(!$event_content.hasClass('expanded') && $event_content[0].scrollIntoView)
	            	{
	            		$event[0].scrollIntoView();
	            		window.scrollBy(0, -76);
	            	}
	            });
	        }
            highlight_code($event.find('pre'));
            link_hashtags($event);
            update_times($event.find('.time-ago'));
            $event.find('[data-toggle="tooltip"]').tooltip();

            return $event;
        }

        self.reset = function()
        {
        	window.scrollTop = 0;
        	self.query_events(
				{},
				function(result){
					self.update_events(result.events, true);
				}
			);
        }

	 	self.update = function()
		{
            var $first = $stream.find('.event:first');
            var order = $first.length ? $first.data('order') : 0;
			self.query_events(
				{'order': order},
				function(result){
					self.update_events(result.events);
				}
			);
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
            if(stream_end)
            {
                return;
            }
			var $more_events = $('.more-events');
			if($more_events.hasClass('loading'))
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

        self.update_times = function(recent_only)
        {
            update_times($stream.find('.time-ago'), recent_only);
        }

        setInterval(function(){self.update_times(true)}, 1000);
        self.update_times();

		self.watcher = new Watcher(config.watcherurl, on_instructions);
		self.watcher.connect();

		$events_container.find('.event').each(function(i, el){
			bind_event($(el));
		});

	}
})(jQuery);

function on_image_selection(stream_id, uuid)
{
    var stream = streams[stream_id];
    if(stream)
    {
        stream.on_new_image(uuid);
    }
}

$(function(){
    var config = $('body').data();
    if(config)
    {
        rpc = new JSONRPC(config.rpcurl);
    }
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

    $(document).on('click', '.subscribe-button', function(){
        var $subscribe_button = $(this);
        var stream_id = $subscribe_button.data('stream');
        if ($subscribe_button.hasClass('unsubscribed'))
        {
            rpc.call(
                'stream.subscribe',
                {'stream': stream_id},
                function(result){
                    $subscribe_button.removeClass('unsubscribed').addClass('subscribed');
                }
            );
        }
        else
        {
            rpc.call(
                'stream.unsubscribe',
                {'stream': stream_id},
                function(result){
                    $subscribe_button.removeClass('subscribed').addClass('unsubscribed');
                }
            );
        }
    });

});

$(function(){

    $('.window-link').click(function(e){
        e.preventDefault()
        var $link = $(this);
        var href = $link.attr('href');
        var title = $link.attr('title');
        window.open(href, title, "width=640, height=480");
    });

    $('.hide-button').click(function(e){
    	var hide = $(this).data('hide');
    	$(hide).fadeOut('fast');
    });

    $('.sign-in-link').click(function(e){

        var $link = $(this);
        var fwd = $link.data('fwd');
        var href = fwd || $link.attr('href');
        var $login=$('#login_modal');
        if($login.length)
        {
            e.preventDefault();
            $login.find('input[name=fwd]').val(href);
            $login.modal();
        }
    })

    link_hashtags($('.event-view .event'));
    update_times($('.event-view .event .time-ago'));
});


