var app = angular.module('app', []);

app.controller('businessScheduleController', function($scope) {
    var toggledDays = [];
    $scope.weekDays = initWeekDays();
    $scope.timeSpanRows = buildTimeSpanArray();

    $scope.addNewLine = function() {
        if(toggledDays.length !== 0) {
            // means few days were toggled
            for(var i = 0; i< toggledDays.length; i++) {
                var toggledDay = toggledDays[i];
                var activeToggledDay = getWeekDay(toggledDay);

                // if last time Slot's end time is not 11PM then add another slot
                var lastTimeSlot = activeToggledDay.timeSlots[activeToggledDay.timeSlots.length - 1];
                var lastEndTime = lastTimeSlot.end.time;
                var diff = Math.floor(moment.duration(moment().endOf('day').diff(lastEndTime)).asHours());
                if(diff !== 0 && diff > 0) {
                    var newTimeSlotObj = getTimeSlotObj(lastTimeSlot.timeSlotIndex + 1);
                    newTimeSlotObj.start.time = lastTimeSlot.end.time.clone();
                    newTimeSlotObj.end.time = moment().endOf('day');
                    activeToggledDay.timeSlots.push(newTimeSlotObj);
                }
            }

            // rebuild timespan array to bind appropriately
            $scope.timeSpanRows = buildTimeSpanArray();
        }
    };

    function initWeekDays() {
        var weekDays = [];
        var days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday'];
        for(var i=0; i< days.length; i++) {
            weekDays.push({
                day: days[i],
                totalHours: function() {
                    var totalHours = 0;
                    for(var i=0; i< this.timeSlots.length; i++) {
                        var timeSlot = this.timeSlots[i];
                        totalHours += Math.floor(moment.duration(timeSlot.end.time.diff(timeSlot.start.time)).asHours());
                    }

                    return totalHours;
                },
                timeSlots: [ getTimeSlotObj(1) ]
            });
        }
        return weekDays;
    };

    function getIncrementDecrementHelperObj(currentTime, toggledDay, currentIndex, type, time) {
        var currentToggledDay = getWeekDay(toggledDay);
        var newTime = null;
        if(type === 'increment') {
            newTime = currentTime.clone().add(1, 'h');
        } else {
            newTime = currentTime.clone().subtract(1, 'h');
        }

        return {
            currentToggledDay: currentToggledDay,
            nextTimeSlot: currentToggledDay.timeSlots[currentIndex + 1],
            previousTimeSlot: currentToggledDay.timeSlots[currentIndex - 1],
            currentTimeSlot: currentToggledDay.timeSlots[currentIndex],
            time: time,
            newTime: newTime
        };
    }

    function canIncrementOrDecrementTime(currentTime, toggledDay, currentIndex, type, time) {
        var helperObj = getIncrementDecrementHelperObj(currentTime, toggledDay, currentIndex, type, time);

        // first check if new date is within today
        if(helperObj.newTime.isSame(new Date(), "day")) {
            if(helperObj.nextTimeSlot) {
                // now make sure that the newly incremented time is not between the next time slot
                if(helperObj.newTime.isBetween(helperObj.nextTimeSlot.start.time, helperObj.nextTimeSlot.end.time)) {
                    return {
                        status: false,
                        message: 'remove all following slots'
                    };
                } else {
                    return {
                        status: true
                    };
                }
            }

            if(helperObj.previousTimeSlot) {
                // now make sure that the newly incremented time is not between the previous time slot
                if(!helperObj.newTime.isBetween(helperObj.previousTimeSlot.start.time, helperObj.previousTimeSlot.end.time)) {
                    return {
                        status: true
                    };
                }
            }

            if(!helperObj.nextTimeSlot && !helperObj.previousTimeSlot) {
                return {
                    status: true
                };
            }

            return {
                status: false
            };
        }

        // means new date is not today
        return {
            status: false
        };
    }

    function processIncrement(currentTime, toggledDay, currentIndex, time) {
        var statusObj = canIncrementOrDecrementTime(currentTime, toggledDay, currentIndex, 'increment', time);
        if(statusObj) {
            if(statusObj.status) {
                currentTime.add(1, 'h');
            } else if(statusObj.message) {
                var toggledWeekDay = getWeekDay(toggledDay);
                toggledWeekDay.timeSlots.splice(currentIndex + 1);
                $scope.timeSpanRows = buildTimeSpanArray();
            }
        }

        if (toggledDays.indexOf(toggledDay) === -1) {
            toggledDays.push(toggledDay);
        }
    }

    function processDecrement(currentTime, toggledDay, currentIndex, time) {
        var statusObj = canIncrementOrDecrementTime(currentTime, toggledDay, currentIndex, 'decrement', time);
        if(statusObj) {
            if(statusObj.status) {
                currentTime.subtract(1, 'h');
            } else if(statusObj.message) {
                console.log(statusObj.message);
                var toggledWeekDay = getWeekDay(toggledDay);
                toggledWeekDay.timeSlots.splice(currentIndex + 1);
                $scope.timeSpanRows = buildTimeSpanArray();
            }
        }

        if (toggledDays.indexOf(toggledDay) === -1) {
            toggledDays.push(toggledDay);
        }
    }

    function buildTimeSpanArray() {
        var maxTimeSpans = 1;
        var timeSpansArr = [1];
        for(var i=0; i< $scope.weekDays.length; i++) {
            var weekDay = $scope.weekDays[i];
            if(maxTimeSpans < weekDay.timeSlots.length) {
                maxTimeSpans = weekDay.timeSlots.length;
            }
        }

        for(var j = 2; j<= maxTimeSpans; j++) {
            timeSpansArr.push(j);
        }

        return timeSpansArr;
    }

    function getTimeSlotObj(timeSlotIndex) {
        return {
            timeSlotIndex: timeSlotIndex,
            start: {
                time: moment().startOf('day'),
                increment: function(toggledDay, currentIndex) {
                    processIncrement(this.time, toggledDay, currentIndex, 'start');
                },
                decrement: function(toggledDay, currentIndex) {
                    processDecrement(this.time, toggledDay, currentIndex, 'start');
                }
            },
            end: {
                time: moment().endOf('day'),
                increment: function(toggledDay, currentIndex) {
                    processIncrement(this.time, toggledDay, currentIndex, 'end');
                },
                decrement: function(toggledDay, currentIndex) {
                    processDecrement(this.time, toggledDay, currentIndex, 'end');
                }
            }
        };
    }

    function getWeekDay(day) {
        for(var j = 0; j < $scope.weekDays.length; j++) {
            if($scope.weekDays[j].day === day) {
                return $scope.weekDays[j];
            }
        }
    }
});

                