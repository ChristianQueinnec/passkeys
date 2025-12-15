work :
	[ -f ../pass.csv ] || { \
		echo "export csv from Keepass" ; exit 1 ; }
	ts-node csv-to-json.ts ../pass.csv ../pass.json
