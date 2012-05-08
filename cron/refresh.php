#!/usr/bin/php
<?php
    /*        
        Refreshes photos from Flickr pool in local MySQL DB, exports data to serialized PHP file (data.inc)
    */
    include('config.php');

    $db = mysql_connect(DB_HOST, DB_USER, DB_PASSWD) or die(mysql_error());
    mysql_select_db('cruise', $db);

    // Set all photo to be in question
    $query = 'update photos set choppingblock = 1';
    $result = mysql_query($query, $db);

    $counts = array('insert'=>0, 'update'=>0, 'delete'=>0, 'skipped'=>0);
    
    // Get some photos
    $i = 1;
    do{
        $page = get_photos($i);
        foreach($page['photos']['photo'] as $photo){
            if(empty($photo['datetaken'])){
                $counts['skipped']++;
                continue;
            }
            $datecreated = strtotime($photo['datetaken']);

            $day = floor(($datecreated - strtotime('2012-02-18')) / 86400);
            if($day < 0 || $day > 7){
                $counts['skipped']++;
                continue;
            }

            $query = "select 1 from photos where photoid='".mysql_real_escape_string($photo['id'])."'";
            $result = mysql_query($query, $db);

            $pageurl = 'http://www.flickr.com/photos/'.$photo['owner'].'/'.$photo['id'].'/';

            if(!empty($photo['iconfarm'])){
                $usericon = 'http://farm'.$photo['iconfarm'].'.staticflickr.com/'.$photo['iconserver'].'/buddyicons/'.$photo['owner'].'.jpg';
            }else{
                $usericon = 'http://www.flickr.com/images/buddyicon.jpg';
            }

            $orientation = 'l';
            if($photo['height_l'] == $photo['width_l']){
                $orientation = 's';
            }else if($photo['height_l'] > $photo['width_l']){
                $orientation = 'p';
            }


            if(mysql_num_rows($result)>0){
                $query = "UPDATE photos SET 
                    photoid='".mysql_real_escape_string($photo['id'])."',
                    pageurl='".mysql_real_escape_string($pageurl)."',
                    smallurl='".mysql_real_escape_string($photo['url_q'])."',
                    largeurl='".mysql_real_escape_string($photo['url_l'])."',
                    orientation='".mysql_real_escape_string($orientation)."',
                    userid='".mysql_real_escape_string($photo['owner'])."',
                    username='".mysql_real_escape_string($photo['ownername'])."',
                    usericon='".mysql_real_escape_string($usericon)."',
                    day='".mysql_real_escape_string($day)."',
                    datecreated='".mysql_real_escape_string($datecreated)."',
                    title='".mysql_real_escape_string($photo['title'])."',
                    choppingblock=0                            
                            WHERE photoid='".mysql_real_escape_string($photo['id'])."'";
                $counts['update']++;
            }else{

                $query = "INSERT INTO photos (photoid, pageurl, smallurl, largeurl, orientation, userid, username, usericon, day, datecreated, title, choppingblock) VALUES (
                    '".mysql_real_escape_string($photo['id'])."',
                    '".mysql_real_escape_string($pageurl)."',
                    '".mysql_real_escape_string($photo['url_q'])."',
                    '".mysql_real_escape_string($photo['url_l'])."',
                    '".mysql_real_escape_string($orientation)."',
                    '".mysql_real_escape_string($photo['owner'])."',
                    '".mysql_real_escape_string($photo['ownername'])."',
                    '".mysql_real_escape_string($usericon)."',
                    '".mysql_real_escape_string($day)."',
                    '".mysql_real_escape_string($datecreated)."',
                    '".mysql_real_escape_string($photo['title'])."',
                    0)";
                $counts['insert']++;
            }
            $result = mysql_query($query);
        }
        if($i==1){
            $totalpages = $page['photos']['pages'];
        }
        $i++;
        echo '.';
    }while($i <= $totalpages);

    $query = 'delete from photos where choppingblock = 1';
    $result = mysql_query($query, $db);
    $counts['delete'] = mysql_affected_rows($db);

    $days = array();
    for($i=0;$i<8;$i++){
        $photos = array();

        $query = "SELECT * FROM photos WHERE day='{$i}' ORDER BY datecreated ASC";
        $result = mysql_query($query, $db);

        $j = 0;

        $day = '<div class="bundle unloaded">';
        while($photo = mysql_fetch_array($result, true)){

            if(($j / 20)==1){
                $j = 0;
                $day .= '</div><div class="bundle unloaded">';
            }
            $j++;

            $day .= <<<IMG
<img data-src="{$photo['smallurl']}" data-id="{$photo['photoid']}"/>
IMG;
            
        }
        $day .= "</div>\n\n";

        $query = "select userid, username, usericon, count(*) c FROM photos where day='{$i}' GROUP BY userid ORDER BY c DESC, username ASC";
        $result = mysql_query($query, $db);
        $namelist = '';
        while($lady = mysql_fetch_array($result, true)){
            $url = 'http://www.flickr.com/photos/'.$lady['userid'].'/';

            $namelist .= <<<NAME

    <a href="{$url}" title="{$lady['username']}" target="author" class="seamonkey"><img src="{$lady['usericon']}"/><span class="name">{$lady['username']}</span> <span class="count">({$lady['c']})</span></a>
NAME;
        }
        $days[$i] = array('imgs'=>$day, 'names'=>$namelist);
    }
    
    $data = serialize($days);
    file_put_contents('data.inc', $data);
    exit;

    function get_photos($page){
        $call = '&page='.$page.'&per_page=500&extras=date_taken,owner_name,icon_server,url_q,url_l';
        return call($call);
    }


    function call($call){
        $api_key = FLICKR_API;

        $url = 'http://api.flickr.com/services/rest/?method=flickr.groups.pools.getPhotos&api_key='.$api_key.'&group_id=1900162%40N24&format=php_serial'.$call;
        $curl = curl_init($url);
        curl_setopt($curl, CURLOPT_RETURNTRANSFER, 1);
        $result = curl_exec($curl);
        curl_close($curl);
        $data = unserialize($result);
        return $data;
    }




?>
