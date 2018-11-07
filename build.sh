#!/bin/bash          
TARGET_DIR="/var/www/visual-tsp"

rm -rf $TARGET_DIR
mkdir -p $TARGET_DIR

#babel --presets react,es2015 visual-tsp-jsx.js > visual-tsp.js

cp visual-tsp.js $TARGET_DIR
cp visual-tsp.css $TARGET_DIR
cp visual-tsp.html $TARGET_DIR
cp destroy.png $TARGET_DIR
cp permutation-engine.js $TARGET_DIR