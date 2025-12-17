work : Makefile
	[ -f ../pass.csv ] || { \
		echo "export csv from Keepass" ; exit 1 ; }
	wc -l ../pass.csv
	ts-node csv-to-json.ts ../pass.csv ../pass.json
	grep '"group"' ../pass.json | wc -l
