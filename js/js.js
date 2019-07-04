const loadingIcon = "#loadingIcon"
var currentBiggestID = 0

function loadIconStart(){
    $(loadingIcon).css('visibility', 'visible')
}

function loadIconStop(){
    $(loadingIcon).fadeOut(200, function(){
        $(loadingIcon).css('display','inline')
        $(loadingIcon).css('visibility','hidden')
    })
}

function mapToObject(map) {
    let obj = Object.create(null);
    for ([k,v] of map) {
        obj[k] = v;
    }
    return obj;
}

function objectToMap(object){
    var map = Object.entries(object)
    for(value of map){
        value[1] = Object.entries(value[1])
    }
    return map
}

var app = angular.module("angApp", ['n3-line-chart']);
app.controller("appController", function($scope){

    $scope.stock = {'ticker':'','price':'', 'percentChange':'', 'divYield':0, 'freeRate':0}
    $scope.submitDetails = {'percentInterval':1, "numberOfIntervals":10}
    $scope.display = {"optionsSelection":false, "expandedExpiries":{}, "profitTable":false}
    $scope.selectedOptions = []
    $scope.mergedOptions = {}
    $scope.rangeOfPrices = []

    $scope.dataForChart = {
        dataset0: [
          {x: expiryConvertToDate('2019-7-4'), val_0: 0.993, val_1: 3.894},
          {x: expiryConvertToDate('2019-7-5'), val_0: 1.947, val_1: 7.174},
          {x: expiryConvertToDate('2019-7-6'), val_0: 2.823, val_1: 9.32},
          {x: expiryConvertToDate('2019-7-7'), val_0: 3.587, val_1: 9.996},
          {x: expiryConvertToDate('2019-7-8'), val_0: 4.207, val_1: 9.093},
          {x: expiryConvertToDate('2019-7-9'), val_0: 4.66, val_1: 6.7553},
          {x: expiryConvertToDate('2019-7-10'), val_0: 4.927, val_1: 3.3525},
          {x: expiryConvertToDate('2019-7-11'), val_0: 4.41, val_1: 3.3525},
          {x: expiryConvertToDate('2019-7-12'), val_0: 4.51437, val_1: 3.125},
          {x: expiryConvertToDate('2019-7-13'), val_0: 2.927, val_1: 3.23425},
          {x: expiryConvertToDate('2019-7-14'), val_0: 4.243, val_1: 3.1525},
          {x: expiryConvertToDate('2019-7-15'), val_0: 3.927, val_1: 3.3252},
        ]
      };

      $scope.lineChartOptions = {
        series: [
          {
            axis: "y",
            dataset: "dataset0",
            key: "val_0",
            label: "An area series 1",
            color: "#1f77b4",
            type: ['line', 'dot'],
            id: 'mySeries1'
          }, 
          {
            axis: "y",
            dataset: "dataset0",
            key: "val_1",
            label: "An area series 2",
            color: "#ff0000",
            type: ['line', 'dot'],
            id: 'mySeries2'
          }
        ],
        tooltipHook: function(d){
            return {
              abscissas: "",
              rows:  d.map(function(s){
                return {
                  label: s.series.label + " => " + dateToString(s.row.x) + " - ",
                  value: s.row.y1,
                  color: s.series.color
                }
              })
            }
          },
        axes: {x: {key: "x", type: "date", ticks: "dataset0".length}}
      };

    $scope.getPrice = (showLoadingIcon) => {
        if(isNaN(minutesSinceLastPriceLoad()) || minutesSinceLastPriceLoad() > 5){
            $.post("/price",{ticker: $scope.stock.tickerSymbol}, function(data){
                //do things with data returned from app js
                console.log(data)
                if( data == null || data.hasOwnProperty('error') || data.hasOwnProperty('unmatched_symbols' )){
                    data = notFound
                }
                $scope.stock.price = data.price
                $scope.stock.percentChange = data.change
                $scope.fillRangeOfPrices()
                if(showLoadingIcon) {loadIconStop()}
                lastPriceLoad = new Date()
                $scope.$apply()
            });
            if(showLoadingIcon) {loadIconStart()} 
        } 
    }
    
    $scope.getOptionsChain = (callback) => {
        $.post("/chain",{ticker: $scope.stock.tickerSymbol}, function(data){
            //do things with data returned from app js
            console.log(data)
            if(data == null || data == undefined || data.hasOwnProperty('error')){
                data = 'NOT FOUND'
                loadIconStop()
            }
            else{
                $scope.chains = data;
                $scope.collapseAllExpiries()
                callback()
                loadIconStop()
                lastOptionsLoad = new Date()
                $scope.$apply()
            }
        });
        loadIconStart()
    }

    $scope.addLeg = () => {
        if(isNaN(minutesSinceLastOptionsLoad()) || minutesSinceLastOptionsLoad() > 5){
            $scope.getPrice(false)
            $scope.getOptionsChain(() => {
                $scope.display.optionsSelection = true;
            })
        }
        else{
            $scope.display.optionsSelection = true;
        }
    }

    $scope.collapseAllExpiries = () => {
        $scope.chains.forEach(x => {
            $scope.display.expandedExpiries[x[0]] = false;
        })
    }

    $scope.expandExpiry = (index) => {
        if($scope.display.expandedExpiries[index] == true){
            $scope.display.expandedExpiries[index] = false
        }
        else{
            $scope.collapseAllExpiries()
            $scope.display.expandedExpiries[index] = true
        }
    }

    $scope.selectOption = ($event, price, strike, expiry, isCall) => {
        var option = {}
        option.price = parseFloat(price)
        option.boughtAt = parseFloat(price)
        option.strike = parseFloat(strike)
        option.expiry = expiry
        option.timeTillExpiry = timeTillExpiry(expiryConvertToDate(option.expiry))
        option.quantity = 1
        option.isCall = isCall
        option.isLong = true;
        option.id = currentBiggestID++
        option.iv = calculateIV(option.timeTillExpiry, option.price, $scope.stock.price, option.strike, option.isCall, $scope.stock.freeRate, $scope.stock.divYield)
        option.ivEdited = option.iv

        console.log(option)
        $scope.selectedOptions.push(option)
        $scope.closeModal()
    }

    $scope.closeModal = () => {
        //close display
        $scope.display.optionsSelection = false;

    }

    $scope.removeLeg = (id) => {
        $scope.selectedOptions.splice($scope.selectedOptions.findIndex(x => x.id == id), 1)
        console.log($scope.selectedOptions)
    }

    $scope.editLeg = (id) => {
        $scope.selectedOptions.splice($scope.selectedOptions.findIndex(x => x.id == id), 1)
        $scope.addLeg()
    }

    $scope.fillRangeOfPrices = () => {
        $scope.rangeOfPrices = []
        min = $scope.stock.price/Math.pow(1+($scope.submitDetails.percentInterval/100), Math.floor($scope.submitDetails.numberOfIntervals/2))
        max = $scope.stock.price*Math.pow(1+($scope.submitDetails.percentInterval/100), Math.floor($scope.submitDetails.numberOfIntervals/2))
        for(i = min; i < max * (1+($scope.submitDetails.percentInterval/200)); i *= (1+($scope.submitDetails.percentInterval/100))){
            $scope.rangeOfPrices.push([i, 0])
        }
        console.log($scope.rangeOfPrices)
    }

    $scope.mergeProfits = (optionsProfits, expiry) => {
        profitMap = []
        //console.log(optionsProfits)
        d = getCurrentDate()
        while(timeBetweenDates(expiryConvertToDate(expiry), d) > -1){
            profitMap.push([dateToString(d),$scope.rangeOfPrices.map(function(arr) {return arr.slice();})])
            for(price of profitMap[profitMap.length-1][1]){
                for(profitSet of optionsProfits){
                    price[1] += mapToObject(mapToObject(profitSet)[dateToString(d)])[price[0]]
                }
            }
            d = incrementOneDay(d)
        }
        return profitMap
    }

    $scope.mergeOptions = (callback) => {
        $scope.mergedOptions = {'boughtAt':0, 'expiry':"", 'greeks':{'delta':0, 'gamma':0, 'theta':0, 'vega':0, 'rho':0}, 'profit':{}}
        
        for (option of $scope.selectedOptions){
            $scope.mergedOptions.boughtAt += (option.isLong ? 1 : -1) * option.boughtAt * option.quantity
    
            $scope.mergedOptions.greeks.delta += option.greeks.delta * option.quantity
            $scope.mergedOptions.greeks.gamma += option.greeks.gamma * option.quantity
            $scope.mergedOptions.greeks.theta += option.greeks.theta * option.quantity
            $scope.mergedOptions.greeks.vega += option.greeks.vega * option.quantity
            $scope.mergedOptions.greeks.rho += option.greeks.rho * option.quantity
        }
        
        optionsProfits = $scope.selectedOptions.map(o => o.profit)

        $scope.mergedOptions.expiry = dateToString($scope.selectedOptions.map( o => expiryConvertToDate(o.expiry) ).sort(timeBetweenDates)[0])
        //console.log($scope.mergedOptions)

        $scope.mergedOptions.roundedProfit = []
        $scope.mergedOptions.profit = $scope.mergeProfits(optionsProfits, $scope.mergedOptions.expiry) 
        for(day of $scope.mergedOptions.profit){
            $scope.mergedOptions.roundedProfit.push([day[0], []])
            for(price of day[1]){
                $scope.mergedOptions.roundedProfit[$scope.mergedOptions.roundedProfit.length-1][1].push([roundPlaces(price[0], 2),roundPlaces(price[1], 2)])
            }
        }

        $scope.mergedOptions.percentProfit = []
        $scope.mergedOptions.profit = $scope.mergeProfits(optionsProfits, $scope.mergedOptions.expiry) 
        for(day of $scope.mergedOptions.profit){
            $scope.mergedOptions.percentProfit.push([day[0], []])
            for(price of day[1]){
                $scope.mergedOptions.percentProfit[$scope.mergedOptions.percentProfit.length-1][1].push([roundPlaces(price[0], 2)
                    ,(roundPlaces(price[1], 2)+$scope.mergedOptions.boughtAt)/Math.abs($scope.mergedOptions.boughtAt)
                    ,hexColorFromPercent( (roundPlaces(price[1], 2)+ Math.abs($scope.mergedOptions.boughtAt))/Math.abs($scope.mergedOptions.boughtAt)  ) ])
            }
        }

        console.log($scope.mergedOptions)
        callback()
    }

    $scope.calculateProfits = (callback) => {
        for(option of $scope.selectedOptions){
            option.greeks = calculateGreeks(option.timeTillExpiry, $scope.stock.price, option.strike, option.isCall, option.isLong, $scope.stock.freeRate, $scope.stock.divYield, option.iv)
            option.profit = []
            d = getCurrentDate()
            while(timeBetweenDates(expiryConvertToDate(option.expiry), d) > 0){
                option.profit.push([dateToString(d),$scope.rangeOfPrices.map(function(arr) {return arr.slice();})])
                for(price of option.profit[option.profit.length-1][1]){
                    price[1] = calculateOptionsPrice(percentageOfYear(timeBetweenDates(expiryConvertToDate(option.expiry), d)), price[0], option.strike, option.isCall, option.isLong, $scope.stock.freeRate, $scope.stock.divYield, option.ivEdited) 
                    price[1] -= option.boughtAt * (option.isLong?1:-1)
                    price[1] *= option.quantity
                }
                d = incrementOneDay(d)
            }

            //PROFIT AT EXPIRY
            option.profit.push([dateToString(d),$scope.rangeOfPrices.map(function(arr) {return arr.slice();})])
            for(price of option.profit[option.profit.length-1][1]){
                price[1] = calculateProfitAtExpiry(option.boughtAt, price[0], option.strike, option.isCall, option.isLong)
            }
            ////////////////
        }
        console.log($scope.selectedOptions)
        $scope.mergeOptions(callback)
    }

    $scope.displayProfit = () => {
        loadIconStart()
        $scope.calculateProfits(() => {
            loadIconStop()
            $scope.display.profitTable = true;
        })
    }

    $scope.init = () => {
        //Things to do on init
    }

    $scope.init()

})