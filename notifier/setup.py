#!/usr/bin/env python

from setuptools import setup

setup(
	name="notifier",
	version="0.1.0",
	entry_points={
		"console_scripts": [
			'notifier = notifier.app:main'
		]
	},
	install_required=[
		"tornado"
	]

)