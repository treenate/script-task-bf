var Header = Java.type('org.apache.http.Header');
var URI = Java.type('java.net.URI');

var HttpEntity = Java.type('org.apache.http.HttpEntity');
var HttpHost = Java.type('org.apache.http.HttpHost');
var HttpResponse = Java.type('org.apache.http.HttpResponse');
var AuthScope = Java.type('org.apache.http.auth.AuthScope');
var UsernamePasswordCredentials = Java.type('org.apache.http.auth.UsernamePasswordCredentials');
var AuthCache = Java.type('org.apache.http.client.AuthCache');
var ClientProtocolException = Java.type('org.apache.http.client.ClientProtocolException');
var CredentialsProvider = Java.type('org.apache.http.client.CredentialsProvider');
var HttpPost = Java.type('org.apache.http.client.methods.HttpPost');
var HttpClientContext = Java.type('org.apache.http.client.protocol.HttpClientContext');
var BasicScheme = Java.type('org.apache.http.impl.auth.BasicScheme');
var BasicAuthCache = Java.type('org.apache.http.impl.client.BasicAuthCache');
var BasicCredentialsProvider = Java.type('org.apache.http.impl.client.BasicCredentialsProvider');
var CloseableHttpClient = Java.type('org.apache.http.impl.client.CloseableHttpClient');
var HttpClients = Java.type('org.apache.http.impl.client.HttpClients');
var EntityUtils = Java.type('org.apache.http.util.EntityUtils');

// First, checks if it isn't implemented yet.
if (!String.prototype.format) {
  String.prototype.format = function() {
    var args = arguments;
    return this.replace(/{(\d+)}/g, function(match, number) { 
      return typeof args[number] != 'undefined'
        ? args[number]
        : match
      ;
    });
  };
}

function JenkinsConnector(urlJenkins, userName, authToken) {
    this._urlJenkins = urlJenkins;
    this._userName = userName;
    this._authToken = authToken;
    this._userPassCred = new UsernamePasswordCredentials(this._userName, this._authToken);

    this.remoteBuild = function(jobName , params ,token) {
        var queueID = '';
        var httpClient;
        try {
            
            var urlJob = '{0}/job/{1}'.format( this._urlJenkins , "jobName");
            //buildWithParameters?token=bdk-token
            if(params != null){
                var urlParam = Object.keys(params).map(function(k) {
                    return encodeURIComponent(k) + '=' + encodeURIComponent(data[k])
                }).join('&')
                urlJob += '/buildWithParameters'+(token != null ? '?token='+token +'&': '?');
                urlJob += urlParam;       
            }else{
                urlJob += '/build'+(token != null ? '?token='+token : '');
            }
            var uri = URI.create(urlJob);
            var host = new HttpHost(uri.getHost(), uri.getPort(), uri.getScheme());

            var credsProvider = new BasicCredentialsProvider();
            credsProvider.setCredentials(new AuthScope(uri.getHost(), uri.getPort()), this._userPassCred);
            var authCache = new BasicAuthCache();
            var basicAuth = new BasicScheme();
            authCache.put(host, basicAuth);

            httpClient = HttpClients.custom().setDefaultCredentialsProvider(credsProvider).build();
            var httpPost = new HttpPost(uri);
            var localContext = HttpClientContext.create();
            localContext.setAuthCache(authCache);

            var response = httpClient.execute(host, httpPost, localContext);

            var regex = /queue\/item\/(\d{1,})?\//i;
            for (var i = 0; i < response.getAllHeaders().length; i++) {
                var header = response.getAllHeaders()[i];
                var name = header.getName();
                var value = header.getValue();
                if (name == 'Location') {
                    var m;
                    if ((m = regex.exec(value)) !== null) {
                        queueID = m[1];
                        break;
                    }
                }
            }

            httpClient.close();

        } catch (err) {
            if (httpClient != null) {
                httpClient.close();
            }
            throw err;
        }
        return queueID;
    }

    this.getQueueItem= function( queueID) {
        var ret = { executable : false };
        var httpClient;
        try {

            var uri = URI.create('{0}/queue/item/{1}/api/json?pretty=true'.format(this._urlJenkins , queueID));
            var host = new HttpHost(uri.getHost(), uri.getPort(), uri.getScheme());

            var credsProvider = new BasicCredentialsProvider();
            credsProvider.setCredentials(new AuthScope(uri.getHost(), uri.getPort()), this._userPassCred);
            var authCache = new BasicAuthCache();
            authCache.put(host, new BasicScheme());

            httpClient = HttpClients.custom().setDefaultCredentialsProvider(credsProvider).build();
            var httpGet = new HttpGet(uri);
            var localContext = HttpClientContext.create();
            localContext.setAuthCache(authCache);

            var response = httpClient.execute(host, httpGet, localContext);
            var statusLine = response.getStatusLine();
            if(statusLine.getStatusCode() >= 300 ){
                throw 'Request fail.'
            }
            var responseBody = EntityUtils.toString(response.getEntity(), "UTF-8");
            if(responseBody.executable){
                ret.executable = true;
                ret.jobID = responseBody.executable.number;
            }
            httpClient.close();

        } catch (err) {
            if (httpClient != null) {
                httpClient.close();
            }
            throw err;
        }
        return ret;
    }
    
    this.getJobItem= function(jobName,jobID) {
        var ret = { };
        var httpClient;
        try {
            var uri = URI.create('{0}/job/{1}/{2}/api/json?pretty=true'.format(this._urlJenkins,jobName,jobID));
            var host = new HttpHost(uri.getHost(), uri.getPort(), uri.getScheme());

            var credsProvider = new BasicCredentialsProvider();
            credsProvider.setCredentials(new AuthScope(uri.getHost(), uri.getPort()), this._userPassCred);
            var authCache = new BasicAuthCache();
            authCache.put(host, new BasicScheme());

            httpClient = HttpClients.custom().setDefaultCredentialsProvider(credsProvider).build();
            var httpGet = new HttpGet(uri);
            var localContext = HttpClientContext.create();
            localContext.setAuthCache(authCache);

            var response = httpClient.execute(host, httpGet, localContext);
            var statusLine = response.getStatusLine();
            if(statusLine.getStatusCode() >= 300 ){
                throw 'Request fail.'
            }
            var responseBody = EntityUtils.toString(response.getEntity(), "UTF-8");
            ret = responseBody;
            httpClient.close();

        } catch (err) {
            if (httpClient != null) {
                httpClient.close();
            }
            throw err;
        }
        return ret;
    }

}

export default JenkinsConnector
