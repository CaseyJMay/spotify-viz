.PHONY: install start build clean

install:
	./install.sh

start:
	./start.sh

build:
	cd viz-frontend && npm run build

clean:
	rm -rf venv viz-frontend/build viz-frontend/node_modules
