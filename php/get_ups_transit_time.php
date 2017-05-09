<?php

function get_ups_transit_time() {
    include 'auth/auth.php';
    include 'ChromePhp.php';
    
    if(isset($_GET['call'])){
        $state = $_GET['state'];
        $zip = $_GET['zip'];
        $date = $_GET['date'];
        $weight = $_GET['weight'];
    }
    
    $ch = curl_init();

    curl_setopt($ch, CURLOPT_URL, "https://onlinetools.ups.com/rest/TimeInTransit");
    curl_setopt($ch, CURLOPT_USERAGENT,'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.17 (KHTML, like Gecko) Chrome/24.0.1312.52 Safari/537.17');
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 20);
    curl_setopt($ch, CURLOPT_SSLVERSION, 6);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, TRUE);
    curl_setopt($ch, CURLOPT_HEADER, FALSE);

    curl_setopt($ch, CURLOPT_POST, TRUE);

    curl_setopt($ch, CURLOPT_CAINFO, dirname(__FILE__) . '/../misc/cacert.pem');
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);

    curl_setopt($ch, CURLOPT_POSTFIELDS, "{
        \"Security\": {
            \"UsernameToken\": { 
                \"Username\": \"$ups_user\", 
                \"Password\": \"$ups_pass\"
            }, \"UPSServiceAccessToken\": {
                \"AccessLicenseNumber\": \"$ups_token\" 
            }
        }, 
        \"TimeInTransitRequest\": {
            \"Request\": { 
                \"RequestOption\": \"TNT\", 
                \"TransactionReference\": {
                    \"CustomerContext\": \"\",
                    \"TransactionIdentifier\": \"\" 
                }
            }, \"ShipFrom\": {
                \"Address\": {
                    \"StateProvinceCode\": \"OR\", 
                    \"CountryCode\": \"US\", 
                    \"PostalCode\": \"97402\"
                } 
            },
            \"ShipTo\": { 
                \"Address\": {
                    \"StateProvinceCode\": \"$state\", 
                    \"CountryCode\": \"US\", 
                    \"PostalCode\": \"$zip\"
                } 
            },
            \"Pickup\": { 
                \"Date\": \"$date\"
            }, 
            \"ShipmentWeight\": {
                \"UnitOfMeasurement\": { 
                    \"Code\": \"lbs\", 
                    \"Description\": \"Description\"
                },
                \"Weight\": \"$weight\" 
            },
            \"MaximumListSize\": \"1\" 
        }
    }");

    curl_setopt($ch, CURLOPT_HTTPHEADER, array(
        "Content-Type: application/json"
    ));

    $response = curl_exec($ch);
    curl_close($ch);

    echo $response;
}

get_ups_transit_time();