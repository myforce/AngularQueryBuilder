var queryBuilder = angular.module('queryBuilder', []);
String.prototype.splice = function(index, count, add) { return this.slice(0, index) + (add || "") + this.slice(index + count); }

queryBuilder.run(['$templateCache', function($templateCache) {
	$templateCache.put('/queryBuilderDirective.html',
		'<div ng-class="[queryBuilder.classes.panels.wrapper, {\'query-invalid\': queryBuilder.isInValid()}]">' +
			'<div ng-if="!!queryBuilder.title" ng-class="queryBuilder.classes.panels.heading">{{queryBuilder.title}}</div>' +
			'<div ng-class="queryBuilder.classes.panels.body">' +
        '<div class="form-inline">' +
            '<select ng-if="queryBuilder.operators.length > 1" ng-options="o.name for o in queryBuilder.operators" ng-model="queryBuilder.group.operator" class="form-control" ng-change="queryBuilder.changeOperator()"></select>' +
            '<button ng-click="queryBuilder.addCondition()" ng-class="queryBuilder.classes.addButton"><span ng-class="queryBuilder.classes.addIcon"></span> Add Condition</button>' +
            '<button ng-if="queryBuilder.nesting" ng-click="queryBuilder.addGroup()" ng-class="queryBuilder.classes.addButton"><span ng-class="queryBuilder.classes.addIcon"></span> Add Group</button>' +
            '<button ng-if="queryBuilder.nesting && !!$parent.queryBuilder.group" ng-click="queryBuilder.removeGroup()" ng-class="queryBuilder.classes.removeButton"><span ng-class="queryBuilder.classes.removeIcon"></span> Remove Group</button>' +
        '</div>' +
        '<div class="group-conditions">' +
            '<div ng-repeat="rule in queryBuilder.group.rules | orderBy:\'index\'" class="condition" ng-class="{\'invalid\': (!rule.comparator && !rule.hasOwnProperty(\'group\')) || (!rule.hasOwnProperty(\'group\') && !!rule.comparator.isValid && !rule.comparator.isValid(rule.data, rule.field))}">' +
                '<div ng-switch="rule.hasOwnProperty(\'group\')">' +
                    '<div ng-switch-when="true">' +
                        '<query-builder fields="queryBuilder.fields" comparators="queryBuilder.comparators" operators="queryBuilder.operators" settings="queryBuilder.settings" group="rule.group" change="queryBuilder.change"></query-builder>' +
                    '</div>' +
                    '<div ng-switch-default="ng-switch-default">' +
											'<div class="form-inline">' +
													'<select ng-change="queryBuilder.changeField($index, rule.fieldId, oldValue); oldValue=rule.fieldId;"  ng-init="oldValue=rule.field.id;" ng-model="rule.fieldId" class="form-control field">' +
													'<option ng-repeat="field in queryBuilder.fields" ng-disabled="field.used" value="{{field.id}}">{{field.name}}</option>'+
													'</select>' +
													'<select ng-change="queryBuilder.changeComparator($index)" ng-options="c.name disable when !!rule.field.disabledComparators && rule.field.disabledComparators.indexOf(c.id) !== -1 for c in queryBuilder.comparators" ng-model="rule.comparator" class="form-control comparator"></select>' +
													'<input ng-if="(!rule.field.options || rule.field.options.length === 0) && !rule.comparator.dataTemplate"type="text" ng-model="rule.data" class="form-control data" ng-change="queryBuilder.changeData()"/>' +
													'<div ng-if="!!rule.comparator.dataTemplate" static-include="{{rule.comparator.dataTemplate}}" change="queryBuilder.change()" data="rule.data" class="data"></div>' +
													'<select ng-if="!rule.comparator.dataTemplate && rule.field.options.length > 0 && rule.comparator.value !== \'->\'" ng-model="rule.data" ng-options="o.name for o in rule.field.options track by o.id" class="form-control data" ng-change="queryBuilder.changeData()"></select>' +
													'<select ng-if="!rule.comparator.dataTemplate && rule.field.options.length > 0 && rule.comparator.value === \'->\'" multiple="true" ng-model="rule.data" ng-options="o.name for o in rule.field.options  track by o.id" class="form-control data" ng-change="queryBuilder.changeData()"></select>' +
													'<button ng-click="queryBuilder.removeCondition($index)" ng-class="queryBuilder.classes.removeButton"><span ng-class="queryBuilder.classes.removeIcon"></span></button>' +
											'</div>' +
									 '</div>' +
								'</div>' +
								'<div ng-if="queryBuilder.separateLinesWithOperator && !$last">' +
									'{{queryBuilder.group.operator.name}}' +
								'</div>' +
						'</div>' +
				'</div>' +
			'</div>' +
		'</div>');
}]);

queryBuilder.factory('queryService', [function() {

	return {
		asString: asString,
		asReadable: asReadable,
		parseFromString: parseFromString,
		isInValid: isInValid,
		isValid: isValid,
		ruleIsInvalid: ruleIsInvalid,
		ruleIsValid: ruleIsValid,
	}

	function getDataValue(data, options) {
		var value;
		if (data.id) {
			options.some(function(option) {
				if (option.id === data.id) {
					value = option.id || option.value;
					return true;
				}
			})
		} else {
			value = data.value;
		}
		if (angular.isUndefined(value)) {
			value = data.id;
		}
		return value;
	}

	function asString(group) {
		if (!group) return "";
		for (var str = "(", i = 0; i < group.rules.length; i++) {
			i > 0 && (str += group.operator.value);
			var dataString = '';
			if (!!group.rules[i].field && !!group.rules[i].field.options &&
				group.rules[i].field.options.length > 0) {
				var isFirst = true;
				if (!!group.rules[i].data && Array.isArray(group.rules[i].data)) {
					group.rules[i].data.forEach(function(data) {
						if (!isFirst) {
							dataString += ',' + getDataValue(data, group.rules[i].field.options);
						} else {
							isFirst = false;
							dataString += getDataValue(data, group.rules[i].field.options);
						}
					});
				} else {
					dataString = getDataValue(group.rules[i].data, group.rules[i].field.options);
				}
			} else {
				dataString = group.rules[i].data;
			}
			str += group.rules[i].group ?
					asString(group.rules[i].group) :
					group.rules[i].field.id + group.rules[i].comparator.value + "\"" + dataString + '"';
		}

		return str + ")";
	}

	function getDataName(data, options) {
		var name;
		if (data.id) {
			options.some(function(option) {
				if (option.id === data.id) {
					name = option.name;
					return true;
				}
			})
		} else {
			name = data.name;
		}
		return name;
	}

	function asReadable(group) {
		if (!group) return "";
		for (var str = "", i = 0; i < group.rules.length; i++) {
			i > 0 && (str += ' ' + group.operator.name + ' ');
			var dataString = '';
			if (!!group.rules[i].field && !!group.rules[i].field.options &&
				group.rules[i].field.options.length > 0) {
				var isFirst = true;
				if (!!group.rules[i].data && Array.isArray(group.rules[i].data)) {
					group.rules[i].data.forEach(function(data) {
						if (!isFirst) {
							dataString += ',' + getDataName(data, group.rules[i].field.options);
						} else {
							isFirst = false;
							dataString += getDataName(data, group.rules[i].field.options);
						}
					});
				} else {
					dataString = group.rules[i].data.name;
				}
			} else {
				dataString = group.rules[i].data;
			}
			str += group.rules[i].group ?
					"(" + asReadable(group.rules[i].group) + ")" :
					group.rules[i].field.name + " " + group.rules[i].comparator.name + " \"" + dataString + '"';
		}

		return str;
	}

	function removeWrappingBraces(spec) {
		if (spec.indexOf('(') !== 0) {
			return spec;
		}
		var areWrapping;
		var openCount = 1;
		var indexOfPreviousOpen = 0;
		var indexOfPreviousClose = 0;
		var indexOfNextOpen = 0;
		var indexOfNextClose = 0;
		while (openCount > 0) {
			indexOfNextOpen = spec.indexOf('(', indexOfPreviousOpen + 1);
			indexOfNextClose = spec.indexOf(')', indexOfPreviousClose + 1);
			if ((indexOfNextOpen === -1 && indexOfNextClose !== -1) ||
							indexOfNextClose < indexOfNextOpen) {
				openCount -= 1;
			} else if ((indexOfNextOpen === -1 && indexOfNextClose === -1) && indexOfNextClose > indexOfNextOpen) {
				openCount += 1;
			}
			indexOfPreviousOpen = indexOfNextOpen;
			indexOfPreviousClose = indexOfNextClose;
		}
		areWrapping = indexOfNextClose === spec.length - 1;
		if (areWrapping) {
			spec = spec.splice(0, 1);
			spec = spec.slice(0, -1);
		}

		return spec;
	}

	function containsOperator(spec, operators) {
		var contains = false;
		operators.forEach(function(operator) {
			if (spec.indexOf(operator.value) !== -1) {
				contains = true;
			}
		});
		return contains;
	}

	function parseFromString(spec, fields, operators, comparators) {
		function getSubGroups(spec, operators) {
			var groups = [];
			var indexOfNextOperator;
			var nextOperator;
			var operatorOfThisSet;
			var indexOfNextOpenBrace;
			var openBraceCount;

			// remove first and last charactre ( and )
			spec = removeWrappingBraces(spec);

			while (spec.length > 0) {
				indexOfNextOperator = spec.length;
				operators.forEach(function(operator) {
					var index = spec.indexOf(operator.value);
					if (index !== -1 && index < indexOfNextOperator) {
						indexOfNextOperator = index;
						nextOperator = operator;
					}
				});
				indexOfNextOpenBrace = spec.indexOf('(');
				if ((indexOfNextOpenBrace !== -1 && indexOfNextOpenBrace > indexOfNextOperator) ||
					indexOfNextOpenBrace === -1) {
					operatorOfThisSet = nextOperator;
					if (indexOfNextOperator !== 0) {
						groups.push(spec.substring(0, indexOfNextOperator));
					}
					if (!!nextOperator) {
						spec = spec.splice(0, indexOfNextOperator + nextOperator.value.length);
					} else {
						spec = spec.splice(0, indexOfNextOperator);
					}
				} else {
					openBraceCount = 1;
					indexOfNextOpenBrace = 0;
					indexOfNextCloseBrace = 0;
					while (openBraceCount > 0) {
						previousIndexOfNextCloseBrace = indexOfNextCloseBrace;
						indexOfNextOpenBrace = spec.indexOf('(', indexOfNextOpenBrace + 1)
						indexOfNextCloseBrace = spec.indexOf(')', indexOfNextCloseBrace + 1);
						if ((indexOfNextOpenBrace === -1 && indexOfNextCloseBrace !== -1) ||
							indexOfNextCloseBrace < indexOfNextOpenBrace) {
							openBraceCount -= 1;
						} else if ((indexOfNextOpenBrace === -1 && indexOfNextCloseBrace === -1) && indexOfNextCloseBrace > indexOfNextOpenBrace) {
							openBraceCount += 1;
						} else {
							throw 'something wrong in condition string';
						}
					}
					groups.push(spec.substring(0, indexOfNextCloseBrace + 1));

					spec = spec.splice(0, indexOfNextCloseBrace + 1);
				}
			}

			return { groups: groups, operator: operatorOfThisSet };
		}

		function convertToRule(spec, comparators, fields) {
			var rule = {
				field: {},
				fieldId: '',
				comparator: {},
				data: ''
			};
			var indexOfComparator;

			var triedComparators = [];
			var comparatorFound = false;
			var fieldFound = false;
			var unfindable = false;

			while ((!comparatorFound || !fieldFound) && !unfindable) {
				comparatorFound = comparators.some(function(comparator) {
					if (spec.indexOf(comparator.value) !== -1 && triedComparators.indexOf(comparator) < 0) {
						rule.comparator = comparator;
						triedComparators.push(comparator);
						indexOfComparator = spec.indexOf(comparator.value);
						return true;
					}
					return false;
				});

				if (!comparatorFound) {
					unfindable = true;
				} else {
					fieldFound = fields.some(function(field) {
						var fieldIdAsString = String(field.id);
						if (spec.indexOf(fieldIdAsString) === 0 && fieldIdAsString.length === indexOfComparator && (!field.disabledComparators || field.disabledComparators.indexOf(rule.comparator.id) < 0)) {
							rule.field = field;
							rule.fieldId = field.id + '';
							return true;
						}
						return false;
					});
				}
			}

			if (unfindable) {
				throw new Error('Parsing of filter from string failed due to comparator that could not be found');
			}

			if (!!rule.field.options && rule.field.options.length > 0) {
				var dataString = spec.substring(String(rule.field.id).length + String(rule.comparator.value).length + 1, spec.length - 1);
				if (dataString.length === 0) {
					if (Array.isArray(rule.comparator.defaultData)) {
						rule.data = [];
					} else {
						rule.data = '';
					}
				} else if (dataString.indexOf(',') === -1) {
					if (angular.isFunction(rule.comparator.getDataObjectById)) {
						var value = rule.comparator.getDataObjectById(dataString, rule.field);
						if (Array.isArray(rule.comparator.defaultData)) {
							rule.data = [value];
						} else {
							rule.data = value;
						}
					} else {
						rule.field.options.forEach(function(option) {
							var optionIdAsString = String(option.id);
							if (dataString.indexOf(optionIdAsString) !== -1 && optionIdAsString.length === dataString.length) {
								if (Array.isArray(rule.comparator.defaultData)) {
									rule.data = [JSON.parse(JSON.stringify(option))];
								} else {
									rule.data = JSON.parse(JSON.stringify(option));
								}
							}
						});
					}
				} else {
					rule.data = [];
					var optionIds = dataString.split(',');
					if (angular.isFunction(rule.comparator.getDataObjectById)) {
						optionIds.forEach(function (optionId) {
							var value = rule.comparator.getDataObjectById(optionId, rule.field);
							rule.data.push(value);
						});
					} else {
						rule.field.options.forEach(function(option) {
							var optionIdAsString = String(option.id);
							if (optionIds.indexOf(optionIdAsString) !== -1) {
								rule.data.push(JSON.parse(JSON.stringify(option)));
							}
						});
					}
				}
			} else {
				rule.data = spec.substring(String(rule.field.id).length + String(rule.comparator.value).length + 1, spec.length - 1);
			}

			return rule;
		};

		var group = {
			operator: {},
			rules: []
		}

		var subgroups = getSubGroups(spec, operators);
		if (!!subgroups.operator) {
			group.operator = subgroups.operator;
		} else {
			group.operator = operators[0];
		}

		subgroups.groups.forEach(function(subGroup) {
			subGroup = removeWrappingBraces(subGroup);
			if (containsOperator(subGroup, operators)) {
				group.rules.push({ group: parseFromString(subGroup, fields, operators, comparators) });
			} else {
				group.rules.push(convertToRule(subGroup, comparators, fields));
			}
		});

		return group;
	}

	function isInValid(group) {
		return !isValid(group);
	}

	function isValid(group) {
		var groupIsValid = true;
		group.rules.forEach(function(rule) {
			if (!!rule.group) {
				groupIsValid = groupIsValid && isValid(rule.group);
			} else {
				groupIsValid = groupIsValid && ruleIsValid(rule);
			}
		});
		return groupIsValid;
	}

	function ruleIsInvalid(rule) {
		return !ruleIsValid(rule);
	}

	function ruleIsValid(rule) {
		return (!!rule.comparator && (!rule.comparator.isValid || rule.comparator.isValid(rule.data, rule.field)))
	}
}]);

queryBuilder.directive('queryBuilder', ['$compile', 'queryService', function($compile, queryService) {
	return {
		restrict: 'E',
		scope: {
			group: '=',
			fields: '=',
			comparators: '=',
			operators: '=',
			asString: '=',
			settings: '=',
			title: '@title',
			watchForString: '=',
			change: '=?'
		},
		controllerAs: 'queryBuilder',
		bindToController: true,
		controller: ['$scope', 'queryService', function(scope, queryService) {
			var vm = this;
			vm.classes = {};
			vm.nesting = true;
			vm.separateLinesWithComparator = false;

			if (!vm.change) {
				vm.change = angular.noop;
			}

			vm.addCondition = function() {
				var field;
				var comparator;
				var data;
				var index = 0;

				if (!vm.onlyAllowFieldsOnce) {
					field = vm.fields[0];
				} else {
					vm.fields.some(function(f) {
						if (!f.used) {
							f.used = true;
							field = f;
							return true;
						}
					});
				}

				if (!field) {
					return;
				}

				while (!comparator && index < vm.comparators.length) {
					if (!field.disabledComparators ||
						field.disabledComparators.indexOf(vm.comparators[index].id) === -1) {
						comparator = vm.comparators[index];
					}
					index++;
				}

				if (!comparator) {
					return;
				}

				if (!!comparator.defaultData) {
					data = JSON.parse(JSON.stringify(comparator.defaultData));
				} else {
					data = '';
				}

				vm.group.rules.push({
					comparator: comparator,
					field: field,
					data: data,
					fieldId: field.id + ''
				});
				vm.change();
			};

			vm.removeCondition = function(index) {
				var fieldId = parseInt(vm.group.rules[index].field.id, 10);
				if (vm.onlyAllowFieldsOnce) {
					vm.fields.some(function(field) {
						if (field.id === fieldId) {
							field.used = false;
							return true;
						}
					});
				}
				vm.group.rules.splice(index, 1);
				vm.change()
			};

			vm.addGroup = function() {
				vm.group.rules.push({
					group: {
						operator: vm.operators[0],
						rules: []
					}
				});
				vm.change();
			};

			vm.removeGroup = function() {
				"group" in scope.$parent.queryBuilder && scope.$parent.queryBuilder.group.rules.splice(scope.$parent.$index, 1);
				vm.change();
			};

			vm.changeField = function(ruleId, newFieldId, oldFieldId) {
				newFieldId = parseInt(newFieldId, 10);
				oldFieldId = parseInt(oldFieldId, 10);
				vm.fields.some(function(field) {
					if (field.id === newFieldId) {
						vm.group.rules[ruleId].field = field;
						return true;
					}
				});
				if (!!vm.group.rules[ruleId].comparator.defaultData) {
					vm.group.rules[ruleId].data = JSON.parse(JSON.stringify(vm.group.rules[ruleId].comparator.defaultData));
				} else {
					vm.group.rules[ruleId].data = '';
				}
				
				if (vm.onlyAllowFieldsOnce) {
					vm.fields.some(function(field) {
						if (field.id === oldFieldId) {
							field.used = false;
							return true;
						}
					});
					vm.fields.some(function(field) {
						if (field.id === newFieldId) {
							field.used = true;
							return true;
						}
					});
				}
				if (!!vm.group.rules[ruleId].field.disabledComparators) {
					if (vm.group.rules[ruleId].field.disabledComparators.indexOf(vm.group.rules[ruleId].comparator.id) !== -1) {
						vm.comparators.some(function(comparator) {
							if (vm.group.rules[ruleId].field.disabledComparators.indexOf(comparator.id) === -1) {
								vm.group.rules[ruleId].comparator = comparator;
								vm.changeComparator(ruleId);
								return true;
							}
						});
					}
				}
				vm.change();
			};

			vm.changeComparator = function (ruleId) {
				if (angular.isDefined(vm.group.rules[ruleId].comparator) &&
					angular.isDefined(vm.group.rules[ruleId].comparator.defaultData)) {
					if ((typeof vm.group.rules[ruleId].data !== typeof vm.group.rules[ruleId].comparator.defaultData ||
						Array.isArray(vm.group.rules[ruleId].data) !== Array.isArray(vm.group.rules[ruleId].comparator.defaultData)) ||
						(queryService.ruleIsInvalid(vm.group.rules[ruleId]))) {
							vm.group.rules[ruleId].data = JSON.parse(JSON.stringify(vm.group.rules[ruleId].comparator.defaultData));
					}
				} else if (queryService.ruleIsInvalid(vm.group.rules[ruleId])) {
					vm.group.rules[ruleId].data = '';
				}
				vm.change();
			}

			vm.changeData = function() {
				vm.change();
			};

			vm.changeOperator = function() {
				vm.change();
			};

			vm.isInValid = function() {
				return queryService.isInValid(vm.group);
			};

			var settingsWatcher = scope.$watch(function() { return scope.settings; },
				function() {
					if (vm.settings && Object.keys(vm.settings).indexOf('nesting') !== -1) {
						vm.nesting = vm.settings.nesting;
					}

					if (vm.settings && Object.keys(vm.settings).indexOf('addIconClass') !== -1) {
						vm.classes.addIcon = vm.settings.addIconClass;
					}
					if (vm.settings && Object.keys(vm.settings).indexOf('removeIconClass') !== -1) {
						vm.classes.removeIcon = vm.settings.removeIconClass;
					}

					if (vm.settings && Object.keys(vm.settings).indexOf('addButtonClass') !== -1) {
						vm.classes.addButton = vm.settings.addButtonClass;
					}
					if (vm.settings && Object.keys(vm.settings).indexOf('removeButtonClass') !== -1) {
						vm.classes.removeButton = vm.settings.removeButtonClass;
					}

					if (vm.settings && Object.keys(vm.settings).indexOf('separateLinesWithOperator') !== -1) {
						vm.separateLinesWithOperator = vm.settings.separateLinesWithOperator;
					}

					if (vm.settings && Object.keys(vm.settings).indexOf('bootstrapPanelsEnabled') !== -1) {
						if (vm.settings.panelsEnabled) {
							vm.classes.panels = {
								wrapper: 'panel panel-default',
								body: 'panel-body',
								heading: 'panel-heading'
							}
						}
					} else {
						vm.classes.panels = {
							wrapper: 'panel panel-default',
							body: 'panel-body',
							heading: 'panel-heading'
						}
					}

					if (vm.settings && Object.keys(vm.settings).indexOf('onlyAllowFieldsOnce') !== -1) {
						vm.onlyAllowFieldsOnce = vm.settings.onlyAllowFieldsOnce;
					} else {
						vm.onlyAllowFieldsOnce = false;
					}
				});

			//2 watches: 1 for input as object, one for input as string when one of them is resolved remove the watches
			var stringWatcher = scope.$watch(function() {return vm.asString}, function(newValue) {
				if (!!newValue && newValue.length > 0) {
					newValue = String(newValue);
					vm.group = queryService.parseFromString(newValue, vm.fields, vm.operators, vm.comparators);
					scope.watchForString = false;
				}
			});

			var objectWatcher = scope.$watch(function() {return vm.group}, function(newValue) {
				if (!!newValue) {
					vm.operators.forEach(function(operator) {
						if (operator.value === vm.group.operator.value) {
							vm.group.operator = operator;
						}
					});
					vm.group.rules.forEach(function(rule) {
						if (angular.isUndefined(rule.group)) {
							vm.comparators.forEach(function(comparator) {
								if (rule.comparator.id === comparator.id) {
									rule.comparator = comparator;
								}
							});
						}

						if (vm.onlyAllowFieldsOnce) {
							vm.fields.some(function(field) {
								if (field.id === rule.field.id) {
									field.used = true;
									return true;
								}
							});
						}
					});
					scope.watchForString = false;
				}
			});

			
		}],
		templateUrl: '/queryBuilderDirective.html',
		compile: function(element, attrs) {
			var content, directive;
			content = element.contents().remove();
			return function(scope, element, attrs) {
				directive || (directive = $compile(content));

				element.append(directive(scope, function($compile) {
					return $compile;
				}));

				scope.watchForString = true;
			}
		}
	}
}]);

queryBuilder.directive('staticInclude', ['$templateRequest', '$compile', function($templateRequest, $compile) {
	var staticScope;
	return {
		restrict: 'A',
		transclude: false,
		replace: false,
		link: function(scope, element, attrs, ctrl, transclude) {
			var templatePath = attrs.staticInclude;

			scope.$watch(function() {
				return attrs.staticInclude;
			}, function(newValue, oldValue) {
				if (oldValue !== newValue) {
					$templateRequest(newValue)
					.then(function(response) {
						staticScope.$destroy();
						element.empty();
						staticScope = scope.$new();
						var contents = element.html(response).contents();
						$compile(contents)(staticScope);
					});
				}
			});

			$templateRequest(templatePath)
				.then(function(response) {
					var contents = element.html(response).contents();
					staticScope = scope.$new();
					$compile(contents)(staticScope);
				});
		}
	};
}]);

﻿var app = angular.module('app', ['ngSanitize', 'queryBuilder', 'hljs', 'ui.bootstrap', 'angularjs-dropdown-multiselect']);
app.config(['hljsServiceProvider', function(hljsServiceProvider) {
	hljsServiceProvider.setOptions({
		// replace tab with 4 spaces
		tabReplace: '  '
	});
}]);
app.controller('QueryBuilderCtrl', ['$scope', '$templateCache', 'queryService', function($scope, $templateCache, queryService) {
	$scope.fields1 = [
		{
			id: 1,
			name: 'Gender'
		},
		{
			id: 2,
			name: 'Age'
		},
		{
			name: 'Favorite city', id: 4
		}
	];

	$scope.comparators1 = [
		{ id: 1, name: 'equal to', value: '==' },
		{ id: 2, name: 'not equal to', value: '!=' },
		{ id: 3, name: 'smaller than', value: '<' },
		{ id: 4, name: 'smaller than or equal to', value: '<=' },
		{ id: 5, name: 'greater than', value: '>' },
		{ id: 6, name: 'greater than or equal to', value: 'equal to or greater' }
	];

	$scope.operators1 = [
		{ name: 'AND', value: '&&' },
		{ name: 'OR', value: '||' }
	];

	$scope.json1 = null;

	$scope.filter1 = {
		group: {
			operator: $scope.operators1[0], rules: []
		}
	};

	$scope.settings1 = {
		nesting: false,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	};

	$scope.$watch('filter1', function(newValue) {
		$scope.json = JSON.stringify(newValue, null, 2);
		$scope.outputReadable = queryService.asReadable(newValue.group);
		$scope.outputString = queryService.asString(newValue.group);
	}, true);

	$scope.fields2 = [
		{
			id: 1,
			name: 'Gender',
			options: [
				{ name: 'male', id: 1},
				{ name: 'female', id: 2}
			],
			disabledComparators: [
				3, 4, 5, 6
			]
		},
		{
			id: 2,
			name: 'Age'
		},
		{
			name: 'Favorite city', id: 3,
			options: [
				{ name: 'paris', id: 1 },
				{ name: 'london', id: 2 },
				{ name: 'brussels', id: 3 }
			],
			disabledComparators: [
				3, 4, 5, 6, 2
			]
		}
	];

	$scope.comparators2 = [
		{ id: 1, name: 'equal to', value: '==', defaultData: ''},
		{ id: 2, name: 'not equal to 1', value: '!=', defaultData: '' },
		{ id: 3, name: 'smaller than', value: '<' },
		{ id: 4, name: 'smaller than or equal to', value: '<=' },
		{ id: 5, name: 'greater than', value: '>' },
		{ id: 6, name: 'greater than or equal to', value: '>=' },
		{ id: 7, name: 'not equal to 2', value: '!=', defaultData: '' },
	];

	$scope.operators2 = [
		{ name: 'AND', value: '&&' },
		{ name: 'OR', value: '||' }
	];

	$scope.settings2 = {
		nesting: true,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	}

	$scope.filter2 = {};
	$scope.queryAsString2 = '((2=="23"||3!="2")&&1=="1")';
	$scope.json2 = null;

	$scope.$watch('filter2', function(newValue) {
		$scope.json2 = JSON.stringify(newValue, null, 2);
		$scope.output2Readable = queryService.asReadable(newValue.group);
		$scope.output2String = queryService.asString(newValue.group);
	}, true);

	$scope.fields3 = [
		{
			name: 'Favorite city', id: 1,
			options: [
				{ label: 'paris', name: 'paris', id: 1 },
				{ label: 'london', name: 'london', id: 2 },
				{ label: 'brussels', name: 'brussels', id: 3 }
			]
		},
		{
			name: 'Favorite city 2', id: 2,
			options: [
				{ label: 'paris', name: 'paris', id: 1 },
				{ label: 'london', name: 'london', id: 2 },
				{ label: 'brussels', name: 'brussels', id: 3 }
			]
		}
	];

	$templateCache.put('inTemplate',
		'<div ng-dropdown-multiselect options="rule.field.options" selected-model="rule.data"></div>'
	);

	$scope.comparators3 = [
		{
			id: 1, name: 'in', value: '->', dataTemplate: 'inTemplate', defaultData: [],
		},
		{ id: 2, name: 'equal to', value: '==' }
	];

	$scope.operators3 = [
		{ name: 'AND', value: '&&' }
	];

	$scope.settings3 = {
		nesting: false,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	}

	$scope.filter3 = {};
	$scope.queryAsString3 = '(1->"")';
	$scope.json3 = null;

	$scope.$watch('filter3', function(newValue) {
		$scope.json3 = JSON.stringify(newValue, null, 2);
		$scope.output3Readable = queryService.asReadable(newValue.group);
		$scope.output3String = queryService.asString(newValue.group);
	}, true);

	$scope.fields4 = [
		{
			id: 1,
			name: 'Gender',
			disabledComparators: [
				1
			]
		},
		{
			id: 2,
			name: 'Age'
		},
		{
			name: 'Favorite city', id: 4
		}
	];

	$scope.comparators4 = [
		{ id: 1, name: 'equal to', value: '==' },
		{ id: 2, name: 'not equal to', value: '!=' },
		{ id: 3, name: 'smaller than', value: '<' },
		{ id: 4, name: 'smaller than or equal to', value: '<=' },
		{ id: 5, name: 'greater than', value: '>' },
		{ id: 6, name: 'greater than or equal to', value: 'equal to or greater' }
	];

	$scope.operators4 = [
		{ name: 'AND', value: '&&' },
		{ name: 'OR', value: '||' }
	];

	$scope.json4 = null;

	$scope.filter4 = {
		group: {
			operator: $scope.operators4[0], rules: []
		}
	};

	$scope.settings4 = {
		nesting: false,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	};

	$scope.$watch('filter4', function(newValue) {
		$scope.json4 = JSON.stringify(newValue, null, 2);
		$scope.outputReadable4 = queryService.asReadable(newValue.group);
		$scope.outputString4 = queryService.asString(newValue.group);
	}, true);

	$scope.fields5 = [
		{
			id: 1,
			name: 'Gender'
		},
		{
			id: 2,
			name: 'Age'
		},
		{
			name: 'Favorite city', id: 4
		}
	];

	$scope.comparators5 = [
		{ id: 1, name: 'equal to', value: '==' },
		{ id: 2, name: 'not equal to', value: '!=' },
		{ id: 3, name: 'smaller than', value: '<' },
		{ id: 4, name: 'smaller than or equal to', value: '<=' },
		{ id: 5, name: 'greater than', value: '>' },
		{ id: 6, name: 'greater than or equal to', value: 'equal to or greater' }
	];

	$scope.operators5 = [
		{ name: 'AND', value: '&&' },
		{ name: 'OR', value: '||' }
	];

	$scope.json5 = null;

	$scope.filter5 = {
		group: {
			operator: $scope.operators5[0], rules: []
		}
	};

	$scope.settings5 = {
		nesting: false,
		onlyAllowFieldsOnce: true,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	};

	$scope.$watch('filter5', function(newValue) {
		$scope.json5 = JSON.stringify(newValue, null, 2);
		$scope.outputReadable5 = queryService.asReadable(newValue.group);
		$scope.outputString5 = queryService.asString(newValue.group);
	}, true);

	$scope.fields6 = [
		{
			name: 'Favorite city', id: 1,
			options: [
				{ label: 'paris', name: 'paris', id: 1 },
				{ label: 'london', name: 'london', id: 2 },
				{ label: 'brussels', name: 'brussels', id: 3 }
			]
		},
		{
			name: 'Favorite city 2', id: 2,
			options: [
				{ label: 'paris', name: 'paris', id: 1 },
				{ label: 'london', name: 'london', id: 2 },
				{ label: 'brussels', name: 'brussels', id: 3 }
			]
		}
	];

	$templateCache.put('inTemplate',
		'<div ng-dropdown-multiselect options="rule.field.options" selected-model="rule.data"></div>'
	);

	$scope.comparators6 = [
		{
			id: 1, name: 'in', value: '->', dataTemplate: 'inTemplate', defaultData: [],
			isValid: function(data) {
				return angular.isArray(data) && data.length > 0;
			}
		},
		{ id: 2, name: 'equal to', value: '==' }
	];

	$scope.operators6 = [
		{ name: 'AND', value: '&&' }
	];

	$scope.settings6 = {
		nesting: true,
		addIconClass: 'glyphicon glyphicon-plus',
		removeIconClass: 'glyphicon glyphicon-minus',
		addButtonClass: 'btn btn-sm btn-success',
		removeButtonClass: 'btn btn-sm btn-danger'
	}

	$scope.filter6 = {
		group: {
			operator: $scope.operators6[0], rules: []
		}
	};
	$scope.json6 = null;

	$scope.$watch('filter6', function(newValue) {
		$scope.json6 = JSON.stringify(newValue, null, 2);
		$scope.output6Readable = queryService.asReadable(newValue.group);
		$scope.output6String = queryService.asString(newValue.group);
	}, true);
}]);
