<?php

$rootdir = "histocolai";

error_reporting(E_ALL);
ini_set('display_errors', 'On');
include "base.php";

$connection=mysqli_connect($dbhost, $dbuser, $dbpass,$dbname) or die("MySQL Error 1: " . mysql_error());

// returns a json with the list of registered users
function get_list_of_users()
{
	global $connection;
	global $dbname;
	
	// get a list of registered users
	$q="SELECT `UserID`, `Username` FROM `Users`";
	$result = mysqli_query($connection,$q);
    
    $user_list = array($result->num_rows);
    $i = 0;
	while($row = mysqli_fetch_assoc($result)) {
        if($row['Username'] != 'auto') {
            $user_list[$i++] = array('id' => $row['UserID'],
                                    'name' => $row['Username']);
        }
    }
    mysqli_free_result($result);
    
    return json_encode($user_list);
    

}

if(isset($_POST['o']) && $_POST['o'] == 'get_list_of_users') {
    print_r(get_list_of_users());
}else{
    echo '<h2>You are not allowed to be here!</h2>';
}

?>
