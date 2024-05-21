<?php

$rootdir = "/histocolai";

error_reporting(E_ALL);
ini_set('display_errors', 'On');
include "base.php";

// user annotations being copied to guest
$user = 'masales';

function copy_user_annotations_to_guest($user)
{
	global $connection;
	global $dbname;
	$guest_annotations=array();

	// first delete "guest" annotations and save them in array
	$q="DELETE FROM `KeyValue` WHERE `myUser`='guest'";
	$result = mysqli_query($connection,$q);

	// then insert '$user' annotations to  guest annotations if not present yet
	$q="SELECT * FROM `KeyValue` WHERE `myTimestamp` "
	   ."IN (SELECT MAX(`myTimestamp`) FROM `KeyValue` "
	   ."WHERE `myUser`='$user' AND `finished`=1 "
	   ."GROUP BY `myOrigin`) AND `myUser`='$user' "
	   ."ORDER BY `UniqueID` ASC ";
	$result = mysqli_query($connection,$q);
	

	while($row = mysqli_fetch_assoc($result)) {

		$q="INSERT INTO ".$dbname.".KeyValue (myTimestamp, myOrigin, "
		."myKey, myValue, mySlice, mySliceName, mySource, myUser, finished) "
		."VALUES('"
		.$row["myTimestamp"]."','"
		.str_replace($user, 'guest', $row["myOrigin"])."','"
		.$row["myKey"]."','"
		.$row["myValue"]."',"
		.$row["mySlice"].",'"
		.$row["mySliceName"]."','"
		.$row["mySource"]."','guest',1)";
		
		$result_in = mysqli_query($connection,$q);

	}
	mysqli_free_result($result);

}

$connection=mysqli_connect($dbhost, $dbuser, $dbpass,$dbname) or die("MySQL Error 1: " . mysql_error());
copy_user_annotations_to_guest($user);

?>
