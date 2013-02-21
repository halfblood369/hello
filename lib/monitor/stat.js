/**
 * stat  receive agent client monitor data
 * merger vaild data that has response
 * when server  restart, it will clear
 *
 *
 */
 var _ = require('underscore');
 var stat = module.exports;
 var _timeDataMap = {};
 var _countDataMap = {};
//avoid underscore bug and big data
stat.maxMapLength = 10000;

stat.getTimeData = function(server){
	var agentLength = server.clients.length;
	var conf = server.runconfig;
	stat.maxMapLength = 100000/(agentLength*conf.agent);
	return doReport(conf.maxuser,agentLength,_timeDataMap);
};

stat.getCountData = function(){
	return stats;
};


stat.merge = function(agent,message){
 	stat.mergeTimeData(agent,message.timeData);
	stat.mergeCountData(agent,message.countData);
};

var stats = {req:0, res:0, inproc: 0, errors_req: 0, errors_resp: 0, ended_req: 0,};

stat.mergeCountData = function(agent,params){
	_countDataMap[agent] = params;
	stats.req+=params.req;
	stats.res+=params.res;
	stats.inproc+=params.inproc;
	stats.errors_req+=params.errors_req;
	stats.errors_resp+=params.errors_resp;
    stats.ended_req+=params.ended_req;
}

stat.mergeTimeData = function(agent,params){
	var result = params;
	if (!_timeDataMap[agent]) {
		_timeDataMap[agent] = result;
	} else {
		var existData = _timeDataMap[agent];
		for (var key in result){
			var detail = _timeDataMap[agent][key];
			if (!!detail && detail.length<stat.maxMapLength){
				var sdata = result[key];
				if (sdata.length<=0) continue;
				_.each(sdata,function(ele){ detail.push(ele); });
			} else {
				_timeDataMap[agent][key]=result[key].slice();
			}
		}
	}
	delete result;
};
/**
 * clear data
 */
 stat.clear = function(agent){
 	if (!!agent) {
 		delete _timeDataMap[agent];
 	} else {
 		_timeDataMap = {};
 	}
 };


 function average (arr) {
 	if (!arr || _.size(arr)<=0) {return 0;}else {
 		return Math.round(_.reduce(arr, function(memo, num) {
 			return memo + num;
 		}, 0) / arr.length);
 	}
 }

 function calcQs(avg,count) {
 	if (avg <=0 ) {return 0;} 
 	else {
 		return Math.round(1000/avg*count);
 	}
 }

 var sumpagesize = 0,summaxsize = 0,singlemaxsize = 0, singlepagesize = 0,times = 0;

 function reCalcSize(maxuserinput,agentinput){
 	summaxsize = maxuserinput*agentinput;
 	sumpagesize = summaxsize;	
 	singlemaxsize = maxuserinput;
 	singlepagesize = singlemaxsize;
 }

/**
  *
	* return sorted key accord data size
	*
	*/
	var dcolumns = [];
	function reCalcColumn(message){
		dcolumns = [];
		var dcolumnsMap = {};
		_.each(message,function(val,key){
			_.each(val,function(kval,akey){
				var _length = _.size(kval);
				if (_length>0) {
					if (!!dcolumnsMap[akey]) {
						dcolumnsMap[akey] = dcolumnsMap[akey]+_length;
					} else {
						dcolumnsMap[akey] = _length;
					}
				}
			});
		});
		var sortedArray = [];
		for (var key in dcolumnsMap){
			var obj = {id:key,val:dcolumnsMap[key]};
			sortedArray.push(obj);
		}
		sortedArray.sort(function(a,b){
			return a.val-b.val;
		})
		for (var index in sortedArray){
			dcolumns.push(sortedArray[index].id);
		}
	}
/**
 * 
 */
 function getGlobalQsRows(gavgrows){
 	var gqsrows = [];
 	for (var index = 0;index<gavgrows.length;index++){
 		var _avgrows = gavgrows[index];
 		var _user = _avgrows[0];
 		var _qsrows = [];
 		_qsrows.push(_user);
 		for(var j = 1;j<_avgrows.length;j++){
 			_qsrows.push(calcQs(_avgrows[j],_user));
 		}
 		gqsrows.push(_qsrows);
 	}
 	return gqsrows;
 }

 function getGlobalAvgData(message){
 	var gavgdata = {};
 	_.each(dcolumns,function(dkey){
 		for (var agentId in message){
 			var agentData = message[agentId];
 			var sdata = agentData[dkey] || [];
 			if (!gavgdata[dkey]) gavgdata[dkey] = [];
 			if (!!gavgdata[dkey]){
 				var _edata = gavgdata[dkey];
 				_.each(sdata,function(ele){ _edata.push(ele); });
 			} else {
 				gavgdata[dkey] = sdata.slice();
 			};
 		}});
 	return gavgdata;
 }

 function getGlobalAvgRows(gavgdata){
 	var gavgrows = [];
 	for (var index = 0;index<times;index++){
 		var __rows = [];
 		__rows.push((index+1));
 		_.each(dcolumns,function(dkey){
 			var __row = 	[gavgdata[dkey][index]] || [0];
 			__rows.push(average(__row));
 		});
 		gavgrows.push(__rows);
 	};
 	return gavgrows;
 };

 function calcTimes(gavgdata){
 	_.each(gavgdata,function(davg,dkey){ times = _.size(davg); return ; });
 }


 function getGlobalSummary(globalSumDatas){
 	var gsummary = {};
 	_.each(globalSumDatas,function(gval,gkey){
 		var _gmin = _.min(gval);
 		var _gmax = _.max(gval);
 		var _gavg = average(gval);
 		var _gqs =calcQs(_gavg,summaxsize);
 		var _gsize = gval.length;
 		var summary = {'max':_gmax,'min':_gmin,'avg':_gavg,'qs':_gqs,'size':_gsize};
 		gsummary[gkey] = (summary);
 	});
 	return gsummary;
 }

 function getDetailSummary(agentSumDatas){
 	var detailAgentSummary = {};
 	_.each(agentSumDatas,function(data,agentKey){
 		var __agentqsrows = {};
 		_.each(data,function(actData,actKey){
 			var _gmin = _.min(actData);
 			var _gmax = _.max(actData);
 			var _gavg = average(actData);
 			var _gqs = calcQs(_gavg,singlemaxsize);
 			var _gsize = actData.length;
 			var summary = {'max':_gmax,'min':_gmin,'avg':_gavg,'qs':_gqs,'size':_gsize};
 			__agentqsrows[actKey] = (summary);
 		});
 		detailAgentSummary[agentKey] = __agentqsrows;
 	});
 	return detailAgentSummary;
 }

 function getDetailRows(gcolumns,agentDetailDatas,detailAgentAvg,detailAgentQs){
 	_.each(agentDetailDatas,function(ddata,agentKey){
 		var __agentavgrows = [];
 		var __agentqsrows = [];
 		for (var index = 0;index<times;index++){
 			var __avgrows = [];
 			var __qsrows = [];
 			var uesrCount = (index+1); 
 			__avgrows.push(uesrCount);
 			__qsrows.push(uesrCount);
 			_.each(dcolumns,function(dkey){
 				var __row = 	ddata[dkey][index] ||[0];
 				var __rowavg = average([__row]);
 				__avgrows.push(__rowavg);
 				__qsrows.push(calcQs(__rowavg,uesrCount));
 			});
 			__agentavgrows.push(__avgrows);
 			__agentqsrows.push(__qsrows);
 		};
 		var everyavgreport = {};
 		everyavgreport['uid']='avg' + agentKey;
 		everyavgreport['rows'] = __agentavgrows;
 		everyavgreport['columns'] = gcolumns;
 		detailAgentAvg.push(everyavgreport);

 		var everyqsreport = {};
 		everyqsreport['uid'] = 'qs' + agentKey;
 		everyqsreport['rows'] = __agentqsrows;
 		everyqsreport['columns'] = gcolumns;
 		detailAgentQs.push(everyqsreport);
 	});
 }

 function mergeDatas(message,globalSumDatas,agentSumDatas,agentDetailDatas){
 	_.each(dcolumns,function(dkey){
 		_.each(message,function(val,agentId){
			//_.each(val,function(sval){
				var sdata = val[dkey] || [];
				if (!!globalSumDatas[dkey]){
					var _egdata = globalSumDatas[dkey];
					_.each(sdata,function(ele){_egdata.push(ele);});
				} else {
					globalSumDatas[dkey] = sdata.slice();
				}
				if (!agentSumDatas[agentId]) agentSumDatas[agentId] = {};
				if (!!agentSumDatas[agentId][dkey]){
					var _edata = agentSumDatas[agentId][dkey];
					_.each(sdata,function(ele){ _edata.push(ele); });
				} else {
					agentSumDatas[agentId][dkey] = sdata.slice();
				};
				if (!agentDetailDatas[agentId]) agentDetailDatas[agentId] = {};
				if (!agentDetailDatas[agentId][dkey]){agentDetailDatas[agentId][dkey]=[];};
				_.each(sdata,function(ele){agentDetailDatas[agentId][dkey].push(ele)});
			//});
 	});
 	});
 }

 function getGlobalColumns(){
 	var gcolumns = [];
 	gcolumns.push('users');
 	_.each(dcolumns,function(dkey){ gcolumns.push(dkey); });
 	return gcolumns;
 }




 function doReport(maxuserinput,agentinput,message){

 	reCalcSize(maxuserinput,agentinput);
 	reCalcColumn(message);

 	var globalSumDatas = {};
 	var agentSumDatas = {};
 	var agentDetailDatas = {};
 	mergeDatas(message,globalSumDatas,agentSumDatas,agentDetailDatas);

 	var gavgdata = getGlobalAvgData(message);
 	calcTimes(gavgdata);

 	var gcolumns = getGlobalColumns();

 	var gavgrows = getGlobalAvgRows(gavgdata);
 	var gqsrows = getGlobalQsRows(gavgrows);
 	var gsummary = getGlobalSummary(globalSumDatas);

 	var globaldata = [];
 	var greport = {};
 	greport['summary'] = gsummary;

 	var gavgreport = {};
 	gavgreport['uid']='avg';
 	gavgreport['rows'] = gavgrows;
 	gavgreport['columns'] = gcolumns;
 	greport['avg'] = gavgreport;

 	var gqsreport = {};
 	gqsreport['uid']='qs';
 	gqsreport['rows'] = gqsrows;
 	gqsreport['columns'] = gcolumns;
 	greport['qs'] = gqsreport;

 	globaldata.push(greport);

 	_agentSumDatas = agentSumDatas;
 	_gcolumns = gcolumns;
 	_agentDetailDatas = agentDetailDatas;

 	var msg = {};

 	if (times>0) {
 		msg.globaldata = globaldata;
 	}

 	return msg;

 }

 var _agentSumDatas = null;
 var _gcolumns = null;
 var _agentDetailDatas = null;


/**
	* below deal with detail agent data
	*/
	stat.getDetails = function() {
		var detailAgentSummary = getDetailSummary(_agentSumDatas);
		var detailAgentAvg = [];
		var detailAgentQs = [];
		getDetailRows(_gcolumns,_agentDetailDatas,detailAgentAvg,detailAgentQs);

		var msg = {};

		msg.detailAgentSummary = detailAgentSummary;
		msg.detailAgentAvg = detailAgentAvg;
		msg.detailAgentQs = detailAgentQs;

		return msg;

	}



