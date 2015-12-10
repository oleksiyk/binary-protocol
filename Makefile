all: node_modules

node_modules: package.json
	@npm install

test:
	@mocha \
		-b \
		--require ./test/globals \
		--recursive \
		--reporter spec \
		test

#
# Clean up
#

clean: clean-node clean-cov

clean-node:
	@rm -rf node_modules

.PHONY: all
.PHONY: test
