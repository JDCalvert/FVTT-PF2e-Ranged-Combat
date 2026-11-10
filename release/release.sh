AUTH_KEY=$(tr -d '\r\n' < release/auth.txt)

curl -X POST \
    -H 'Content-Type: application/json' \
    -H "Authorization: $AUTH_KEY" \
    -d @release/request.json \
    https://foundryvtt.com/_api/packages/release_version/
