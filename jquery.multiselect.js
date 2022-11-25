/**
 * Display a nice easy to use multiselect list
 * @Version: 2.4.21
 * @Author: Patrick Springstubbe
 * @Contact: @JediNobleclem
 * @Website: springstubbe.us
 * @Source: https://github.com/nobleclem/jQuery-MultiSelect
 *
 * Usage:
 *     $('select[multiple]').multiselect();
 *     $('select[multiple]').multiselect({ texts: { placeholder: 'Select options' } });
 *     $('select[multiple]').multiselect('reload');
 *     $('select[multiple]').multiselect( 'loadOptions', [{
 *         name   : 'Option Name 1',
 *         value  : 'option-value-1',
 *         checked: false,
 *         attributes : {
 *             custom1: 'value1',
 *             custom2: 'value2'
 *         }
 *     },{
 *         name   : 'Option Name 2',
 *         value  : 'option-value-2',
 *         checked: false,
 *         attributes : {
 *             custom1: 'value1',
 *             custom2: 'value2'
 *         }
 *     }]);
 *
 **/
(function($){
    var defaults = {
        columns: 1,     // how many columns should be use to show options
        search : false, // include option search box
        serverSide: false, // flag of server-side processing

        // search filter options
        searchOptions : {
            delay        : 250,                  // time (in ms) between keystrokes until search happens
            showOptGroups: false,                // show option group titles if no options remaining
            searchText   : true,                 // search within the text
            searchValue  : false,                // search within the value
            onSearch     : function( element ){} // fires on keyup before search on options happens
        },

        // plugin texts
        texts: {
            placeholder    : 'Select options', // text to use in dummy input
            search         : 'Search',         // search input placeholder text
            searchNoResult : 'No results',     // search results not found text
            selectedOptions: 'Selected Option',      // selected suffix text
            selectedOptionsPluralize: 'Selected Options',      // selected suffix text
            selectAll      : 'Select all',     // select all text
            unselectAll    : 'Unselect all',   // unselect all text
            noneSelected   : 'None Selected'   // None selected text
        },

        // general options
        hasAllOptions          : false, // used to keep track of current select all state
        selectAll              : false, // add select all option
        selectGroup            : false, // select entire optgroup
        minHeight              : 200,   // minimum height of option overlay
        maxHeight              : null,  // maximum height of option overlay
        maxWidth               : null,  // maximum width of option overlay (or selector)
        maxPlaceholderWidth    : null,  // maximum width of placeholder button
        maxPlaceholderOpts     : 10,    // maximum number of placeholder options to show until "# selected" shown instead
        showCheckbox           : true,  // display the checkbox to the user
        checkboxAutoFit        : false,  // auto calc checkbox padding
        optionAttributes       : [],    // attributes to copy to the checkbox from the option element
        replacePlaceholderText : true, // replace text of placeholder if button is too small

        // Callbacks
        onLoad        : function( element ){},           // fires at end of list initialization
        onOptionClick : function( element, option ){},   // fires when an option is clicked
        onControlOpen : function( element ){},           // fires when the options list is opened
        onControlClose: function( element ){},           // fires when the options list is closed
        onSelectAll   : function( element, selected ){}, // fires when (un)select all is clicked
        onPlaceholder : function( element, placeholder, selectedOpts ){}, // fires when the placeholder txt is updated

        // Server-side processing parameters when serverSide = true.
        serverSideParameters: {
            url                : null,                      // url to get data
            csrftoken          : null,                      // csrf token because all requests are POST
            params             : null,                      // parameters that will be sent as query params or data in the body request
            current_page       : 1,                         // keeps the page number to server-side process case
            search_current_page: 1,                         // keeps the page number to server-side process case
            loaderText         : 'Loading more results...', // loader text while the multiselect get the data
            selectedOptionsId  :[],
            optionsData        :[],
        },
        data                   : [],                         // used in server-side proccessing to control data flow
        data_temp              : []                          // used in server-side proccessing to control data flow

    };

    var msCounter    = 1; // counter for each select list
    var msOptCounter = 1; // counter for each option on page

    // FOR LEGACY BROWSERS (talking to you IE8)
    if( typeof Array.prototype.map !== 'function' ) {
        Array.prototype.map = function( callback, thisArg ) {
            if( typeof thisArg === 'undefined' ) {
                thisArg = this;
            }

            return $.isArray( thisArg ) ? $.map( thisArg, callback ) : [];
        };
    }
    if( typeof String.prototype.trim !== 'function' ) {
        String.prototype.trim = function() {
            return this.replace(/^\s+|\s+$/g, '');
        };
    }

    function MultiSelect( element, options )
    {
        this.element           = element;
        this.options           = $.extend( true, {}, defaults, options );
        this.updateSelectAll   = true;
        this.updatePlaceholder = true;
        this.listNumber        = msCounter;

        msCounter = msCounter + 1; // increment counter

        /* Make sure its a multiselect list */
        if( !$(this.element).attr('multiple') ) {
            throw new Error( '[jQuery-MultiSelect] Select list must be a multiselect list in order to use this plugin' );
        }

        /* Options validation checks */
        if( this.options.search ){
            if( !this.options.searchOptions.searchText && !this.options.searchOptions.searchValue ){
                throw new Error( '[jQuery-MultiSelect] Either searchText or searchValue should be true.' );
            }
        }

        /** BACKWARDS COMPATIBILITY **/
        if( 'placeholder' in this.options ) {
            this.options.texts.placeholder = this.options.placeholder;
            delete this.options.placeholder;
        }
        if( 'default' in this.options.searchOptions ) {
            this.options.texts.search = this.options.searchOptions['default'];
            delete this.options.searchOptions['default'];
        }
        /** END BACKWARDS COMPATIBILITY **/

        // load this instance
        this.load();
    }

    // changed by simepar to allow put loader inside multiselect
    function MultiSelect( element, options, loader_selector )
    {
        this.element           = element;
        this.options           = $.extend( true, {}, defaults, options );
        this.updateSelectAll   = true;
        this.updatePlaceholder = true;
        this.listNumber        = msCounter;

        msCounter = msCounter + 1; // increment counter

        /* Make sure its a multiselect list */
        if( !$(this.element).attr('multiple') ) {
            throw new Error( '[jQuery-MultiSelect] Select list must be a multiselect list in order to use this plugin' );
        }

        /* Options validation checks */
        if( this.options.search ){
            if( !this.options.searchOptions.searchText && !this.options.searchOptions.searchValue ){
                throw new Error( '[jQuery-MultiSelect] Either searchText or searchValue should be true.' );
            }
        }

        /** BACKWARDS COMPATIBILITY **/
        if( 'placeholder' in this.options ) {
            this.options.texts.placeholder = this.options.placeholder;
            delete this.options.placeholder;
        }
        if( 'default' in this.options.searchOptions ) {
            this.options.texts.search = this.options.searchOptions['default'];
            delete this.options.searchOptions['default'];
        }
        /** END BACKWARDS COMPATIBILITY **/

        // load this instance
        this.load();
    }
    MultiSelect.prototype = {
        /* LOAD CUSTOM MULTISELECT DOM/ACTIONS */
        load: function() {
            var instance = this;
            // make sure this is a select list and not loaded
            if( (instance.element.nodeName != 'SELECT') || $(instance.element).hasClass('jqmsLoaded') ) {
                return true;
            }

            // sanity check so we don't double load on a select element
            $(instance.element).addClass('jqmsLoaded ms-list-'+ instance.listNumber ).data( 'plugin_multiselect-instance', instance );

            // add option container
            $(instance.element).after('<div id="ms-list-'+ instance.listNumber +'" class="ms-options-wrap"><button type="button"><span>None Selected</span></button><div class="ms-options"><ul></ul></div></div>');

            var placeholder = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> button:first-child');
            var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
            var optionsList = optionsWrap.find('> ul');

            // don't show checkbox (add class for css to hide checkboxes)
            if( !instance.options.showCheckbox ) {
                optionsWrap.addClass('hide-checkbox');
            }
            else if( instance.options.checkboxAutoFit ) {
                optionsWrap.addClass('checkbox-autofit');
            }

            // check if list is disabled
            if( $(instance.element).prop( 'disabled' ) ) {
                placeholder.prop( 'disabled', true );
            }

            // set placeholder maxWidth
            if( instance.options.maxPlaceholderWidth ) {
                placeholder.css( 'maxWidth', instance.options.maxPlaceholderWidth );
            }

            // override with user defined maxHeight
            if( instance.options.maxHeight ) {
                var maxHeight = instance.options.maxHeight;
            }
            else {
                // cacl default maxHeight
                var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
            }

            // maxHeight cannot be less than options.minHeight
            maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

            optionsWrap.css({
                maxWidth : instance.options.maxWidth,
                minHeight: instance.options.minHeight,
                maxHeight: maxHeight,
            });

            // isolate options scroll
            // @source: https://github.com/nobleclem/jQuery-IsolatedScroll
            optionsWrap.on( 'touchmove mousewheel DOMMouseScroll', function ( e ) {
                if( ($(this).outerHeight() < $(this)[0].scrollHeight) ) {
                    var e0 = e.originalEvent,
                        delta = e0.wheelDelta || -e0.detail;

                    if( ($(this).outerHeight() + $(this)[0].scrollTop) > $(this)[0].scrollHeight ) {
                        e.preventDefault();
                        this.scrollTop += ( delta < 0 ? 1 : -1 );
                    }
                }
            });

            // hide options menus if click happens off of the list placeholder button
            $(document).off('click.ms-hideopts').on('click.ms-hideopts', function( event ){
                if( !$(event.target).closest('.ms-options-wrap').length ) {
                    $('.ms-options-wrap.ms-active > .ms-options').each(function(){
                        $(this).closest('.ms-options-wrap').removeClass('ms-active');

                        var listID = $(this).closest('.ms-options-wrap').attr('id');

                        var thisInst = $(this).parent().siblings('.'+ listID +'.jqmsLoaded').data('plugin_multiselect-instance');

                        // USER CALLBACK
                        if( typeof thisInst.options.onControlClose == 'function' ) {
                            thisInst.options.onControlClose( thisInst.element );
                        }
                    });
                }
                // hide open option lists if escape key pressed
            }).on('keydown', function( event ){
                if( (event.keyCode || event.which) == 27 ) { // esc key
                    $(this).trigger('click.ms-hideopts');
                }
            });

            // handle pressing enter|space while tabbing through
            placeholder.on('keydown', function( event ){
                var code = (event.keyCode || event.which);
                if( (code == 13) || (code == 32) ) { // enter OR space
                    placeholder.trigger( 'mousedown' );
                }
            });

            // disable button action
            placeholder.on( 'mousedown', function( event ){
                // ignore if its not a left click
                if( event.which && (event.which != 1) ) {
                    return true;
                }

                // hide other menus before showing this one
                $('.ms-options-wrap.ms-active').each(function(){
                    if( $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded')[0] != optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded')[0] ) {
                        $(this).removeClass('ms-active');

                        var thisInst = $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded').data('plugin_multiselect-instance');

                        // USER CALLBACK
                        if( typeof thisInst.options.onControlClose == 'function' ) {
                            thisInst.options.onControlClose( thisInst.element );
                        }
                    }
                });

                // show/hide options
                optionsWrap.closest('.ms-options-wrap').toggleClass('ms-active');

                // recalculate height
                if( optionsWrap.closest('.ms-options-wrap').hasClass('ms-active') ) {
                    // USER CALLBACK
                    if( typeof instance.options.onControlOpen == 'function' ) {
                        instance.options.onControlOpen( instance.element );
                    }

                    optionsWrap.css( 'maxHeight', '' );

                    // override with user defined maxHeight
                    if( instance.options.maxHeight ) {
                        var maxHeight = instance.options.maxHeight;
                    }
                    else {
                        // cacl default maxHeight
                        var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
                    }

                    if( maxHeight ) {
                        // maxHeight cannot be less than options.minHeight
                        maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

                        optionsWrap.css( 'maxHeight', maxHeight );
                    }
                }
                else if( typeof instance.options.onControlClose == 'function' ) {
                    instance.options.onControlClose( instance.element );
                }
            }).click(function( event ){ event.preventDefault(); });

            // add placeholder copy
            if( instance.options.texts.placeholder ) {
                placeholder.find('span').text( instance.options.texts.placeholder );
            }

            // add search box
            if( instance.options.search ) {
                optionsList.before('<div class="ms-search"><input type="text" value="" placeholder="'+ instance.options.texts.search +'" /></div>');
                optionsList.after('<div class="no-result-message">' + instance.options.texts.searchNoResult + '</div>');

                var search = optionsWrap.find('.ms-search input');

                search.on('keyup', function(){

                    // ignore keystrokes that don't make a difference
                    if( $(this).data('lastsearch') == $(this).val() ) {
                        return true;
                    }

                    // pause timeout
                    if( $(this).data('searchTimeout') ) {
                        clearTimeout( $(this).data('searchTimeout') );
                    }

                    var thisSearchElem = $(this);

                    $(this).data('searchTimeout', setTimeout(function(){
                        thisSearchElem.data('lastsearch', thisSearchElem.val() );
                        if (instance.options.serverSide){
                            instance.options.serverSideParameters.search_current_page = 1;
                            serverSideGetData(instance, optionsWrap, $.trim(search.val().toLowerCase()));
                        } else {
                            // USER CALLBACK
                            if (typeof instance.options.searchOptions.onSearch == 'function') {
                                instance.options.searchOptions.onSearch(instance.element);
                            }

                            // search non optgroup li's
                            var searchString = $.trim(search.val().toLowerCase());
                            if (searchString) {
                                optionsList.find('li[data-search-term*="' + searchString + '"]:not(.optgroup)').removeClass('ms-hidden');
                                optionsList.find('li:not([data-search-term*="' + searchString + '"], .optgroup)').addClass('ms-hidden');
                            } else {
                                optionsList.find('.ms-hidden').removeClass('ms-hidden');
                            }

                            // show/hide optgroups based on if there are items visible within
                            if (!instance.options.searchOptions.showOptGroups) {
                                optionsList.find('.optgroup').each(function () {
                                    if ($(this).find('li:not(.ms-hidden)').length) {
                                        $(this).show();
                                    } else {
                                        $(this).hide();
                                    }
                                });
                            }

                            instance._updateSelectAllText();
                        }
                    }, instance.options.searchOptions.delay ));
                });
            }

            // add global select all options
            if( instance.options.selectAll ) {
                optionsList.before('<a href="#" class="ms-selectall global">' + instance.options.texts.selectAll + '</a>');
            }

            // handle select all option
            optionsWrap.on('click', '.ms-selectall', function( event ){
                event.preventDefault();

                instance.updateSelectAll   = false;
                instance.updatePlaceholder = false;

                let groupCounter = 0; // used in server-side processing: keeps the counters from groups
                var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');

                if( $(this).hasClass('global') ) {
                    // check if any options are not selected if so then select them

                    let value = false;
                    if( optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').length ) {
                        // get unselected vals, mark as selected, return val list
                        optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
                        optionsList.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
                        value = true;

                    }
                    // deselect everything
                    else {
                        optionsList.find('li:not(.optgroup, .ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
                        optionsList.find('li:not(.optgroup, .ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
                    }

                    // used in server-side processing: update selectAll info and get the sum of all group counters.
                    if (instance.options.serverSide) {
                        groupCounter = changeStateSelectData(instance, null, value);
                    }
                }
                else if( $(this).closest('li').hasClass('optgroup') ) {
                    var optgroup = $(this).closest('li.optgroup');

                    let value = false;
                    // check if any selected if so then select them
                    if( optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').length ) {
                        optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
                        optgroup.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
                    }
                    // deselect everything
                    else {
                        optgroup.find('li:not(.ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
                        optgroup.find('li:not(.ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
                    }
                }

                var vals = [];
                optionsList.find('li.selected input[type="checkbox"]').each(function(){
                    vals.push( $(this).val() );
                });
                select.val( vals ).trigger('change');

                instance.updateSelectAll   = true;
                instance.updatePlaceholder = true;

                // USER CALLBACK
                if( typeof instance.options.onSelectAll == 'function' ) {
                    instance.options.onSelectAll( instance.element, vals.length );
                }

                instance._updateSelectAllText();
                instance._updatePlaceholderText();
            });

            // add options to wrapper
            var options = [];
            $(instance.element).children().each(function(){
                if( this.nodeName == 'OPTGROUP' ) {
                    var groupOptions = [];

                    $(this).children('option').each(function(){
                        var thisOptionAtts = {};
                        for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                            var thisOptAttr = instance.options.optionAttributes[ i ];

                            if( $(this).attr( thisOptAttr ) !== undefined ) {
                                thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                            }
                        }

                        groupOptions.push({
                            name   : $(this).text(),
                            value  : $(this).val(),
                            checked: $(this).prop( 'selected' ),
                            attributes: thisOptionAtts
                        });
                    });

                    options.push({
                        label  : $(this).attr('label'),
                        options: groupOptions
                    });
                }
                else if( this.nodeName == 'OPTION' ) {
                    var thisOptionAtts = {};
                    for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                        var thisOptAttr = instance.options.optionAttributes[ i ];

                        if( $(this).attr( thisOptAttr ) !== undefined ) {
                            thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                        }
                    }

                    options.push({
                        name      : $(this).text(),
                        value     : $(this).val(),
                        checked   : $(this).prop( 'selected' ),
                        attributes: thisOptionAtts
                    });
                }
                else {
                    // bad option
                    return true;
                }
            });
            instance.loadOptions( options, true, false );

            // BIND SELECT ACTION
            optionsWrap.on( 'click', 'input[type="checkbox"]', function(){
                $(this).closest( 'li' ).toggleClass( 'selected' );

                var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');

                // toggle clicked option


                select.find('option[value="'+ instance._escapeSelector( $(this).val() ) +'"]').prop(
                    'selected', $(this).is(':checked')
                ).closest('select').trigger('change');

                // USER CALLBACK
                if( typeof instance.options.onOptionClick == 'function' ) {
                    instance.options.onOptionClick(instance.element, this);
                }

                instance._updateSelectAllText();
                instance._updatePlaceholderText();
            });

            // BIND FOCUS EVENT
            optionsWrap.on('focusin', 'input[type="checkbox"]', function(){
                $(this).closest('label').addClass('focused');
            }).on('focusout', 'input[type="checkbox"]', function(){
                $(this).closest('label').removeClass('focused');
            });

            // USER CALLBACK
            if( typeof instance.options.onLoad === 'function' ) {
                instance.options.onLoad( instance.element );
            }

            // hide native select list
            $(instance.element).hide();
        },

        /* LOAD SELECT OPTIONS */
        loadOptions: function( options, overwrite, updateSelect ) {
            overwrite    = (typeof overwrite == 'boolean') ? overwrite : true;
            updateSelect = (typeof updateSelect == 'boolean') ? updateSelect : true;
            var instance    = this;
            var select      = $(instance.element);
            var optionsList = select.siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options > ul');
            var optionsWrap = select.siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');

            if( overwrite ) {
                optionsList.find('> li').remove();

                if( updateSelect ) {
                    select.find('> *').remove();
                }
            }
            var containers = [];
            for( var key in options ) {
                // Prevent prototype methods injected into options from being iterated over.
                if( !options.hasOwnProperty( key ) ) {
                    continue;
                }

                var thisOption      = options[ key ];
                var container       = $('<li/>');
                var appendContainer = true;

                // OPTION
                if( thisOption.hasOwnProperty('value') ) {
                    if( instance.options.showCheckbox && instance.options.checkboxAutoFit ) {
                        container.addClass('ms-reflow');
                    }

                    // add option to ms dropdown
                    instance._addOption( container, thisOption );

                    if( updateSelect ) {
                        var selOption = $('<option/>', {
                            value: thisOption.value,
                            text : thisOption.name
                        });

                        // add custom user attributes
                        if( thisOption.hasOwnProperty('attributes') && Object.keys( thisOption.attributes ).length ) {
                            selOption.attr( thisOption.attributes );
                        }

                        // mark option as selected
                        if( thisOption.checked ) {
                            selOption.prop( 'selected', true );
                        }
                        select.append( selOption );
                    }
                }
                // OPTGROUP
                else if( thisOption.hasOwnProperty('options') ) {
                    var optGroup = $('<optgroup/>', {
                        label: thisOption.label
                    });

                    optionsList.find('> li.optgroup > span.label').each(function(){
                        if( $(this).text() == thisOption.label ) {
                            container       = $(this).closest('.optgroup');
                            appendContainer = false;

                            if (instance.options.serverSide){
                                // shows the hidden group when data is returned
                                if (thisOption.options.length > 0 && container.hasClass("ms-hidden")){
                                    container.removeClass("ms-hidden");
                                }
                            }
                        }
                    });

                    // prepare to append optgroup to select element
                    if( updateSelect ) {
                        if( select.find('optgroup[label="'+ thisOption.label +'"]').length ) {
                            optGroup = select.find('optgroup[label="'+ thisOption.label +'"]');
                        }
                        else {
                            select.append( optGroup );
                        }
                    }

                    // setup container
                    if( appendContainer ) {
                        container.addClass('optgroup');

                        if (instance.options.serverSide){
                            var exist = optGroup.find(" option[value='"+thisOption.value+"']").length > 0;
                            // add custom group attributes
                            if( thisOption.hasOwnProperty('attributes') && Object.keys( thisOption.attributes ).length ) {
                                container.attr( thisOption.attributes );
                                instance.options.data.push(thisOption.attributes);
                                // hides the hidden group when data exists, but has not yet been fetched
                                if (thisOption.options.length == 0){
                                    container.addClass("ms-hidden");
                                }
                            }
                        }
                        container.append('<span class="label">'+ thisOption.label +'</span>');
                        container.find('> .label').css({
                            clear: 'both'
                        });

                        // add select all link
                        if( instance.options.selectGroup ) {
                            container.append('<a href="#" class="ms-selectall">' + instance.options.texts.selectAll + '</a>');
                        }

                        container.append('<ul/>');
                    }

                    for( var gKey in thisOption.options ) {
                        // Prevent prototype methods injected into options from
                        // being iterated over.
                        if( !thisOption.options.hasOwnProperty( gKey ) ) {
                            continue;
                        }

                        var thisGOption = thisOption.options[ gKey ];
                        var gContainer  = $('<li/>');
                        if( instance.options.showCheckbox && instance.options.checkboxAutoFit ) {
                            gContainer.addClass('ms-reflow');
                        }

                        // no clue what this is we hit (skip)
                        if( !thisGOption.hasOwnProperty('value') ) {
                            continue;
                        }

                        if (instance.options.serverSide){
                            var has_option = container.find("input[value="+thisGOption.value+"]").length > 0

                            if (!has_option)
                                instance._addOption(gContainer, thisGOption);
                        }
                        else {
                            instance._addOption(gContainer, thisGOption);
                        }

                        container.find('> ul').append( gContainer );

                        // add option to optgroup in select element
                        if( updateSelect ) {
                            var selOption = $('<option/>', {
                                value: thisGOption.value,
                                text : thisGOption.name
                            });

                            // add custom user attributes
                            if( thisGOption.hasOwnProperty('attributes') && Object.keys( thisGOption.attributes ).length ) {
                                selOption.attr( thisGOption.attributes );
                            }

                            // mark option as selected
                            if( thisGOption.checked ) {
                                selOption.prop( 'selected', true );
                            }

                            optGroup.append( selOption );
                        }
                    }
                }
                else {
                    // no clue what this is we hit (skip)
                    continue;
                }

                if( appendContainer ) {
                    containers.push( container );
                }
            }
            optionsList.append( containers );

            // pad out label for room for the checkbox
            if( instance.options.checkboxAutoFit && instance.options.showCheckbox && !optionsWrap.hasClass('hide-checkbox') ) {
                var chkbx = optionsList.find('.ms-reflow:eq(0) input[type="checkbox"]');
                if( chkbx.length ) {
                    var checkboxWidth = chkbx.outerWidth();
                    checkboxWidth = checkboxWidth ? checkboxWidth : 15;

                    optionsList.find('.ms-reflow label').css(
                        'padding-left',
                        (parseInt( chkbx.closest('label').css('padding-left') ) * 2) + checkboxWidth
                    );

                    optionsList.find('.ms-reflow').removeClass('ms-reflow');
                }
            }

            // update placeholder text
            if (!instance.options.serverSide) {
                instance._updatePlaceholderText();
            }

            // RESET COLUMN STYLES
            optionsWrap.find('ul').css({
                'column-count'        : '',
                'column-gap'          : '',
                '-webkit-column-count': '',
                '-webkit-column-gap'  : '',
                '-moz-column-count'   : '',
                '-moz-column-gap'     : ''
            });

            // COLUMNIZE
            if( select.find('optgroup').length ) {
                // float non grouped options
                optionsList.find('> li:not(.optgroup)').css({
                    'float': 'left',
                    width: (100 / instance.options.columns) +'%'
                });

                // add CSS3 column styles
                optionsList.find('li.optgroup').css({
                    clear: 'both'
                }).find('> ul').css({
                    'column-count'        : instance.options.columns,
                    'column-gap'          : 0,
                    '-webkit-column-count': instance.options.columns,
                    '-webkit-column-gap'  : 0,
                    '-moz-column-count'   : instance.options.columns,
                    '-moz-column-gap'     : 0
                });

                // for crappy IE versions float grouped options
                if( this._ieVersion() && (this._ieVersion() < 10) ) {
                    optionsList.find('li.optgroup > ul > li').css({
                        'float': 'left',
                        width: (100 / instance.options.columns) +'%'
                    });
                }
            }
            else {
                // add CSS3 column styles
                optionsList.css({
                    'column-count'        : instance.options.columns,
                    'column-gap'          : 0,
                    '-webkit-column-count': instance.options.columns,
                    '-webkit-column-gap'  : 0,
                    '-moz-column-count'   : instance.options.columns,
                    '-moz-column-gap'     : 0
                });

                // for crappy IE versions float grouped options
                if( this._ieVersion() && (this._ieVersion() < 10) ) {
                    optionsList.find('> li').css({
                        'float': 'left',
                        width: (100 / instance.options.columns) +'%'
                    });
                }
            }

            // update un/select all logic
            instance._updateSelectAllText();
        },

        /* UPDATE MULTISELECT CONFIG OPTIONS */
        settings: function( options ) {
            this.options = $.extend( true, {}, this.options, options );
            this.reload();
        },

        /* RESET THE DOM */
        unload: function() {
            $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').remove();
            $(this.element).show(function(){
                $(this).css('display','').removeClass('jqmsLoaded');
            });
        },

        /* RELOAD JQ MULTISELECT LIST */
        reload: function() {
            // remove existing options
            $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').remove();
            $(this.element).removeClass('jqmsLoaded');

            // load element
            this.load();
            updateSelectedListWithBackendData(this)
        },

        reloadWithFavorite: function() {
            // remove existing options
            $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').remove();
            $(this.element).removeClass('jqmsLoaded');

            // load element
            this.load();
            updateSelectedListWithBackendData(this, true)
        },

        // RESET BACK TO DEFAULT VALUES & RELOAD
        reset: function() {
            var defaultVals = [];
            $(this.element).find('option').each(function(){
                if( $(this).prop('defaultSelected') ) {
                    defaultVals.push( $(this).val() );
                }
            });

            $(this.element).val( defaultVals );

            this.reload();
        },

        disable: function( status ) {
            status = (typeof status === 'boolean') ? status : true;
            $(this.element).prop( 'disabled', status );
            $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').find('button:first-child')
                .prop( 'disabled', status );
        },

        /** PRIVATE FUNCTIONS **/
        // update the un/select all texts based on selected options and visibility
        _updateSelectAllText: function(){
            if( !this.updateSelectAll ) {
                return;
            }

            var instance = this;

            // select all not used at all so just do nothing
            if( !instance.options.selectAll && !instance.options.selectGroup ) {
                return;
            }

            var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');

            // update un/select all text

            optionsWrap.find('.ms-selectall').each(function(){
                var unselected = $(this).parent().find('li:not(.optgroup,.selected,.ms-hidden)');

                $(this).text(
                    unselected.length ? instance.options.texts.selectAll : instance.options.texts.unselectAll
                );
            });

            var shownOptionsCount = optionsWrap.find('> ul li:not(.optgroup,.ms-hidden)').length;

            // show/hide no-results message
            optionsWrap.find('.no-result-message').toggle( shownOptionsCount ? false : true );

            // show/hide (un)select all element as necessary
            optionsWrap.find('.ms-selectall.global').toggle( shownOptionsCount ? true : false );
        },

        // update selected placeholder text
        _updatePlaceholderText: function(groupCounter){
            if( !this.updatePlaceholder ) {
                return;
            }

            var instance       = this;
            var select         = $(instance.element);
            var selectVals     = select.val() ? select.val() : [];
            var placeholder    = select.siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> button:first-child');
            var placeholderTxt = placeholder.find('span');
            var optionsWrap    = select.siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');

            selectVals = this.options.serverSide ? this.options.serverSideParameters.optionsData : selectVals;

            // if there are disabled options get those values as well
            if( select.find('option:selected:disabled').length ) {
                selectVals = [];
                select.find('option:selected').each(function(){
                    selectVals.push( $(this).val() );
                });
            }

            // get selected options
            var selOpts = [];
            if (! instance.options.serverSide){
                for( var key in selectVals ) {
                    // Prevent prototype methods injected into options from being iterated over.
                    if( !selectVals.hasOwnProperty( key ) ) {
                        continue;
                    }

                    selOpts.push(
                        $.trim( select.find('option[value="'+ instance._escapeSelector( selectVals[ key ] ) +'"]').text() )
                    );

                    if( selOpts.length >= instance.options.maxPlaceholderOpts ) {
                        break;
                    }
                }
            } else {
                if (instance.options.serverSideParameters.selectedOptionsId.length <= instance.options.maxPlaceholderOpts){
                    selectVals.forEach(function (item, index) {
                        item.options.forEach(function(o, i) {
                            selOpts.push(o.name)
                        })
                    })
                } else {
                    selOpts = instance.options.serverSideParameters.selectedOptionsId
                }
            }

            // UPDATE PLACEHOLDER TEXT WITH OPTIONS SELECTED
            placeholderTxt.text( selOpts.join( ', ' ) );

            if( selOpts.length ) {
                optionsWrap.closest('.ms-options-wrap').addClass('ms-has-selections');

                // USER CALLBACK
                if( typeof instance.options.onPlaceholder == 'function' ) {
                    instance.options.onPlaceholder( instance.element, placeholderTxt, selOpts );
                }
            }
            else {
                optionsWrap.closest('.ms-options-wrap').removeClass('ms-has-selections');
            }

            // replace placeholder text
            if( !selOpts.length ) {
                placeholderTxt.text( instance.options.texts.placeholder );
            }
            // if copy is larger than button width use "# selected"
            else if( (placeholderTxt.width() > placeholder.width()) || (selOpts.length != selectVals.length) ) {
                if (instance.options.serverSide){
                    if (groupCounter > 0){
                        placeholderTxt.text(groupCounter + ' ' + instance.options.texts.selectedOptions);
                    }else{
                        if (selOpts.length > 1){
                            placeholderTxt.text(selOpts.length + ' ' + instance.options.texts.selectedOptionsPluralize);
                        } else {
                            placeholderTxt.text(selOpts.length + ' ' + instance.options.texts.selectedOptionsPluralize);
                        }
                    }
                }
                else {
                    placeholderTxt.text(selectVals.length + ' ' + instance.options.texts.selectedOptions);
                }
            }
        },

        // Add option to the custom dom list
        _addOption: function( container, option ) {

            var instance = this;
            // if (instance.options.serverSide){
            //     option.name = option.title
            // }
            var optionNameText = $('<div/>').html( option.name ).text();

            var thisOption = $('<label/>', {
                for : 'ms-opt-'+ msOptCounter
            }).html( option.name );

            thisOption.addClass('customized-checkbox customized-checkbox-multiselect');
            thisOption.append("<span class='customized-checkbox-span'></span>");

            var thisCheckbox = $('<input>', {
                type : 'checkbox',
                title: optionNameText,
                id   : 'ms-opt-'+ msOptCounter,
                value: option.value
            });

            // add user defined attributes
            if( option.hasOwnProperty('attributes') && Object.keys( option.attributes ).length ) {
                thisCheckbox.attr( option.attributes );
            }

            if( option.checked ) {
                container.addClass('default selected');
                thisCheckbox.prop( 'checked', true );
            }

            thisOption.prepend( thisCheckbox );

            var searchTerm = '';
            if( instance.options.searchOptions.searchText ) {
                searchTerm += ' ' + optionNameText.toLowerCase();
            }
            if( instance.options.searchOptions.searchValue ) {
                searchTerm += ' ' + option.value.toLowerCase();
            }

            container.attr( 'data-search-term', $.trim( searchTerm ) ).prepend( thisOption );

            msOptCounter = msOptCounter + 1;
        },

        // check ie version
        _ieVersion: function() {
            var myNav = navigator.userAgent.toLowerCase();
            return (myNav.indexOf('msie') != -1) ? parseInt(myNav.split('msie')[1]) : false;
        },

        // escape selector
        _escapeSelector: function( string ) {
            if( typeof $.escapeSelector == 'function' ) {
                return $.escapeSelector( string );
            }
            else {
                return string.replace(/[!"#$%&'()*+,.\/:;<=>?@[\\\]^`{|}~]/g, "\\$&");
            }
        }
    };

    //reload and load function overwrited by simepar to allow not delete entire multiselect, only the list options
    // when data is reloaded and add loader inside multiselect
    MultiSelect.prototype.reload = function() {

        $(this.element).closest('.container-flex-grow').find('.ms-options').remove();
        $(this.element).removeClass('jqmsLoaded');
        updateSelectedListWithBackendData(this)
        this.load();

    }

    MultiSelect.prototype.appendLoader = function(){
        var instance = this;
        var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');

        var loader_element = $(instance.options.loader_selector);
        var $loader_copy = loader_element.clone();
        if ($loader_copy.attr("id")){
            $loader_copy.attr("id", $loader_copy.attr("id").replace("-template", ""))
        }
        optionsWrap.append($loader_copy);
    }

    MultiSelect.prototype.load= function() {
        var instance = this;
        instance.options.hasAllOptions = false;
        // make sure this is a select list and not loaded
        if( (instance.element.nodeName != 'SELECT') || $(instance.element).hasClass('jqmsLoaded') ) {
            return true;
        }

        // sanity check so we don't double load on a select element
        $(instance.element).addClass('jqmsLoaded ms-list-'+ instance.listNumber ).data( 'plugin_multiselect-instance', instance );

        // add option container
        if (  $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').length<=0) {
            $(instance.element).after('<div id="ms-list-' + instance.listNumber + '" class="ms-options-wrap"><button type="button"><span>None Selected</span></button><div class="ms-options"><ul></ul></div></div>');
        }
        else{
            $(this.element).siblings('#ms-list-'+ this.listNumber +'.ms-options-wrap').append('<div class="ms-options"><ul></ul></div>');
        }

        var placeholder = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> button:first-child');
        var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
        var optionsList = optionsWrap.find('> ul');

        //code changed by simepar to allow insert loader inside multiselect
        this.appendLoader();
        //end of the code

        // don't show checkbox (add class for css to hide checkboxes)
        if( !instance.options.showCheckbox ) {
            optionsWrap.addClass('hide-checkbox');
        }
        else if( instance.options.checkboxAutoFit ) {
            optionsWrap.addClass('checkbox-autofit');
        }

        // check if list is disabled
        if( $(instance.element).prop( 'disabled' ) ) {
            placeholder.prop( 'disabled', true );
        }

        // set placeholder maxWidth
        if( instance.options.maxPlaceholderWidth ) {
            placeholder.css( 'maxWidth', instance.options.maxPlaceholderWidth );
        }

        // override with user defined maxHeight
        if( instance.options.maxHeight ) {
            var maxHeight = instance.options.maxHeight;
        }
        else {
            // cacl default maxHeight
            var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
        }

        // maxHeight cannot be less than options.minHeight
        maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

        optionsWrap.css({
            maxWidth : instance.options.maxWidth,
            minHeight: instance.options.minHeight,
            maxHeight: maxHeight,
        });

        // isolate options scroll
        // @source: https://github.com/nobleclem/jQuery-IsolatedScroll
        optionsWrap.on( 'touchmove mousewheel DOMMouseScroll', function ( e ) {
            if( ($(this).outerHeight() < $(this)[0].scrollHeight) ) {
                var e0 = e.originalEvent,
                    delta = e0.wheelDelta || -e0.detail;

                if( ($(this).outerHeight() + $(this)[0].scrollTop) > $(this)[0].scrollHeight ) {
                    e.preventDefault();
                    this.scrollTop += ( delta < 0 ? 1 : -1 );
                }
            }
        });

        // hide options menus if click happens off of the list placeholder button
        $(document).off('click.ms-hideopts').on('click.ms-hideopts', function( event ){
            if( !$(event.target).closest('.ms-options-wrap').length ) {
                $('.ms-options-wrap.ms-active > .ms-options').each(function(){
                    $(this).closest('.ms-options-wrap').removeClass('ms-active');

                    var listID = $(this).closest('.ms-options-wrap').attr('id');

                    var thisInst = $(this).parent().siblings('.'+ listID +'.jqmsLoaded').data('plugin_multiselect-instance');

                    // USER CALLBACK
                    if( typeof thisInst.options.onControlClose == 'function' ) {
                        thisInst.options.onControlClose( thisInst.element );
                    }
                });
            }
            // hide open option lists if escape key pressed
        }).on('keydown', function( event ){
            if( (event.keyCode || event.which) == 27 ) { // esc key
                $(this).trigger('click.ms-hideopts');
            }
        });

        // handle pressing enter|space while tabbing through
        placeholder.on('keydown', function( event ){
            var code = (event.keyCode || event.which);
            if( (code == 13) || (code == 32) ) { // enter OR space
                placeholder.trigger( 'mousedown' );
            }
        });

        // disable button action
        placeholder.on( 'mousedown', function( event ){
            // ignore if its not a left click
            if( event.which && (event.which != 1) ) {
                return true;
            }

            // hide other menus before showing this one
            $('.ms-options-wrap.ms-active').each(function(){
                if( $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded')[0] != optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded')[0] ) {
                    $(this).removeClass('ms-active');

                    var thisInst = $(this).siblings( '.'+ $(this).attr('id') +'.jqmsLoaded').data('plugin_multiselect-instance');

                    // USER CALLBACK
                    if( typeof thisInst.options.onControlClose == 'function' ) {
                        thisInst.options.onControlClose( thisInst.element );
                    }
                }
            });

            // show/hide options
            optionsWrap.closest('.ms-options-wrap').toggleClass('ms-active');

            // recalculate height
            if( optionsWrap.closest('.ms-options-wrap').hasClass('ms-active') ) {
                // USER CALLBACK
                if( typeof instance.options.onControlOpen == 'function' ) {
                    instance.options.onControlOpen( instance.element );
                }

                optionsWrap.css( 'maxHeight', '' );

                // override with user defined maxHeight
                if( instance.options.maxHeight ) {
                    var maxHeight = instance.options.maxHeight;
                }
                else {
                    // cacl default maxHeight
                    var maxHeight = ($(window).height() - optionsWrap.offset().top + $(window).scrollTop() - 20);
                }

                if( maxHeight ) {
                    // maxHeight cannot be less than options.minHeight
                    maxHeight = maxHeight < instance.options.minHeight ? instance.options.minHeight : maxHeight;

                    optionsWrap.css( 'maxHeight', maxHeight );
                }
            }
            else if( typeof instance.options.onControlClose == 'function' ) {
                instance.options.onControlClose( instance.element );
            }
        }).click(function( event ){ event.preventDefault(); });

        // add placeholder copy
        if( instance.options.texts.placeholder ) {
            placeholder.find('span').text( instance.options.texts.placeholder );
        }

        // add search box
        if( instance.options.search ) {
            optionsList.before('<div class="ms-search"><input type="text" value="" placeholder="'+ instance.options.texts.search +'" /></div>');
            optionsList.after('<div class="no-result-message">' + instance.options.texts.searchNoResult + '</div>');

            var search = optionsWrap.find('.ms-search input');

            search.on('keyup', function(){
                // ignore keystrokes that don't make a difference
                // if( $(this).data('lastsearch') == $(this).val() ) {
                //     return true;
                // }

                // pause timeout
                if( $(this).data('searchTimeout') ) {
                    clearTimeout( $(this).data('searchTimeout') );
                }

                var thisSearchElem = $(this);

                $(this).data('searchTimeout', setTimeout(function(){
                    thisSearchElem.data('lastsearch', thisSearchElem.val() );
                    if (instance.options.serverSide){
                        instance.options.hasAllOptions = false
                        instance.options.serverSideParameters.search_current_page = 1;
                        serverSideGetData(instance, optionsWrap, $.trim(search.val().toLowerCase()));
                    } else {
                        // USER CALLBACK
                        if (typeof instance.options.searchOptions.onSearch == 'function') {
                            instance.options.searchOptions.onSearch(instance.element);
                        }

                        // search non optgroup li's
                        var searchString = $.trim(search.val().toLowerCase());
                        if (searchString) {
                            optionsList.find('li[data-search-term*="' + searchString + '"]:not(.optgroup)').removeClass('ms-hidden');
                            optionsList.find('li:not([data-search-term*="' + searchString + '"], .optgroup)').addClass('ms-hidden');
                        } else {
                            optionsList.find('.ms-hidden').removeClass('ms-hidden');
                        }

                        // show/hide optgroups based on if there are items visible within
                        if (!instance.options.searchOptions.showOptGroups) {
                            optionsList.find('.optgroup').each(function () {
                                if ($(this).find('li:not(.ms-hidden)').length) {
                                    $(this).show();
                                } else {
                                    $(this).hide();
                                }
                            });
                        }

                        instance._updateSelectAllText();
                    }
                }, instance.options.searchOptions.delay ));
            });
        }

        // add global select all options
        if( instance.options.selectAll ) {
            optionsList.before('<a href="#" class="ms-selectall global">' + instance.options.texts.selectAll + '</a>');
        }

        // handle select all option
        optionsWrap.on('click', '.ms-selectall', function( event ){
            event.preventDefault();
            instance.updateSelectAll   = false;
            instance.updatePlaceholder = false;
            var groupCounter = null
            var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');
            var unselect = false;

            if( $(this).hasClass('global') ) {
                // check if any options are not selected if so then select them
                if( optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').length ) {
                    // get unselected vals, mark as selected, return val list
                    // optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
                    // optionsList.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
                }
                // deselect everything
                else {
                    unselect = true;
                    // optionsList.find('li:not(.optgroup, .ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
                    // optionsList.find('li:not(.optgroup, .ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
                }
                selectAllOptions(instance, unselect)
                if (instance.options.serverSide) {

                    serverSideGetData(instance, optionsWrap, null, true, null, unselect);
                }
            }
            else if( $(this).closest('li').hasClass('optgroup') ) {
                var optgroup = $(this).closest('li.optgroup');

                // check if any selected if so then select them
                unselectGroup = false
                if( optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').length ) {
                    selectServersideGroup(instance, optgroup)
                    optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
                    optgroup.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
                    value = true;
                }
                // deselect everything
                else {
                    unselectGroup = true
                    unselectServersideGroup(instance,optgroup)
                    optgroup.find('li:not(.ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
                    optgroup.find('li:not(.ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
                }

                if (instance.options.serverSide)
                    serverSideGetData(instance, optionsWrap, null, false, optgroup.data("group-id"), unselectGroup);

                if (instance.options.serverSide){
                    data = {
                        'id': parseInt($(optgroup).attr("data-group-id")),
                        'counter': parseInt($(optgroup).attr("data-group-counter")),
                        'selectAll': value
                    }
                    groupCounter = changeStateSelectData(instance, data, value);
                }
            }

            var vals = [];
            optionsList.find('li.selected input[type="checkbox"]').each(function(){
                vals.push( $(this).val() );
            });
            select.val( vals ).trigger('change');

            instance.updateSelectAll   = true;
            instance.updatePlaceholder = true;

            // USER CALLBACK
            if( typeof instance.options.onSelectAll == 'function' ) {
                instance.options.onSelectAll( instance.element, vals.length );
            }

            instance._updateSelectAllText();
            if (instance.options.serverSide)
                instance._updatePlaceholderText(groupCounter);
            else
                instance._updatePlaceholderText();


        });

        // add options to wrapper
        var options = [];
        $(instance.element).children().each(function(){
            if( this.nodeName == 'OPTGROUP' ) {
                var groupOptions = [];

                $(this).children('option').each(function(){
                    var thisOptionAtts = {};
                    for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                        var thisOptAttr = instance.options.optionAttributes[ i ];

                        if( $(this).attr( thisOptAttr ) !== undefined ) {
                            thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                        }
                    }

                    groupOptions.push({
                        name   : $(this).text(),
                        value  : $(this).val(),
                        checked: $(this).prop( 'selected' ),
                        attributes: thisOptionAtts
                    });
                });

                options.push({
                    label  : $(this).attr('label'),
                    options: groupOptions
                });
            }
            else if( this.nodeName == 'OPTION' ) {
                var thisOptionAtts = {};
                for( var i = 0; i < instance.options.optionAttributes.length; i++ ) {
                    var thisOptAttr = instance.options.optionAttributes[ i ];

                    if( $(this).attr( thisOptAttr ) !== undefined ) {
                        thisOptionAtts[ thisOptAttr ] = $(this).attr( thisOptAttr );
                    }
                }

                options.push({
                    name      : $(this).text(),
                    value     : $(this).val(),
                    checked   : $(this).prop( 'selected' ),
                    attributes: thisOptionAtts
                });
            }
            else {
                // bad option
                return true;
            }
        });
        instance.loadOptions( options, true, false );

        // BIND SELECT ACTION
        optionsWrap.on( 'click', 'input[type="checkbox"]', function(){
            $(this).closest( 'li' ).toggleClass( 'selected' );

            var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');

            // toggle clicked option
            select.find('option[value="'+ instance._escapeSelector( $(this).val() ) +'"]').prop(
                'selected', $(this).is(':checked')
            ).closest('select').trigger('change');

            // USER CALLBACK
            if( typeof instance.options.onOptionClick == 'function' ) {
                instance.options.onOptionClick(instance.element, this);
            }

            instance._updateSelectAllText();
            instance._updatePlaceholderText();
            if (instance.options.serverSide){
                toggleServersideOption(instance, $(this))
            }
        });

        // BIND FOCUS EVENT
        optionsWrap.on('focusin', 'input[type="checkbox"]', function(){
            $(this).closest('label').addClass('focused');
        }).on('focusout', 'input[type="checkbox"]', function(){
            $(this).closest('label').removeClass('focused');
        });

        // USER CALLBACK
        if( typeof instance.options.onLoad === 'function' ) {
            instance.options.onLoad( instance.element );
        }

        // hide native select list
        $(instance.element).hide();
        if (instance.options.serverSide) {
            instance.options.serverSideParameters.current_page = 1;
            serverSideGetData(instance, optionsWrap);
        }
    },
        // ENABLE JQUERY PLUGIN FUNCTION
        $.fn.multiselect = function( options ){
            if( !this.length ) {
                return;
            }

            var args = arguments;
            var ret;

            // menuize each list
            if( (options === undefined) || (typeof options === 'object') ) {
                return this.each(function(){
                    if( !$.data( this, 'plugin_multiselect' ) ) {
                        $.data( this, 'plugin_multiselect', new MultiSelect( this, options ) );
                    }
                });
            } else if( (typeof options === 'string') && (options[0] !== '_') && (options !== 'init') ) {
                this.each(function(){
                    var instance = $.data( this, 'plugin_multiselect' );

                    if( instance instanceof MultiSelect && typeof instance[ options ] === 'function' ) {
                        ret = instance[ options ].apply( instance, Array.prototype.slice.call( args, 1 ) );
                    }

                    // special destruct handler
                    if( options === 'unload' ) {
                        $.data( this, 'plugin_multiselect', null );
                    }
                });

                return ret;
            }
        };

    /**
     * To manipulate new and existing data
     * @param {Object} instance - Current instance from element
     * @param {JSON} newData - Object to be compared
     * @param {Boolean} selectAllValue - Flag to switch function behavior
     * @returns {*|number}
     */
    function changeStateSelectData(instance, newData, selectAllValue){
        let src = instance.options.data;
        if (src.length > 0){
            instance.options.data.map(function(item) {
                if (selectAllValue != null){
                    if (item['data-group-id'] === newData.id) {
                        item.selectAll = selectAllValue;
                    }
                } else {
                    item.selectAll = selectAllValue;
                }
            });
        }
        let counter = 0;
        instance.options.data.map(function(item) {
            if (item.selectAll){ counter += item['data-group-counter']; }
        });
        return counter;
    }

    function formatOptions(data){
        let result = []

        var groupBy = function(array, k) {
            return array.reduce(function(acc, cur) {
                if (cur["group_id"] == k)
                    (acc[cur["group_id"]] = acc[cur["group_id"]] || []).push(cur);
                return acc;
            }, {});
        };

        data.groups.forEach((group_data, i) => {
            let group_result_data = {}

            group_result_data['label']=group_data.title;
            group_result_data['attributes']= {
                'data-group-id':group_data.id,
                'data-group-counter':group_data.size,
                "selectAll":false
            };

            group_options_result_data = []

            let grouped_options = Object.values(groupBy(data.options, group_data.id))
            if (grouped_options.length>0) {
                grouped_options[0].forEach((option, i) => {var attributes = {}
                    if (option.disabled == 'disabled')
                        attributes['disabled'] = true;

                    group_options_result_data.push(
                        {
                            "name": option.title,
                            "value": option.value,
                            "checked": false,
                            "attributes":attributes,
                        }
                    )
                });

                group_result_data['options']=group_options_result_data
                result.push(group_result_data)
            }
        });


        return result;

    }

    function selectGroupAllOptions(instance, groupId, unselectGroup) {
        instance.updateSelectAll   = false;
        instance.updatePlaceholder = false;
        var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
        var optionsList = optionsWrap.find('> ul');
        var groupCounter = null
        var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');

        var optgroup =$('li[data-group-id="'+groupId+'"]');
        // check if any selected if so then select them
        if(!unselectGroup) {
            selectServersideGroup(instance, optgroup)
            optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
            optgroup.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
            value = true;
        }
        // deselect everything
        else {
            unselectServersideGroup(instance, optgroup)
            optgroup.find('li:not(.ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
            optgroup.find('li:not(.ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
        }
        if (instance.options.serverSide){
            data = {
                'id': parseInt($(optgroup).attr("data-group-id")),
                'counter': parseInt($(optgroup).attr("data-group-counter")),
                'selectAll': value
            }
            groupCounter = changeStateSelectData(instance, data, value);
        }


        var vals = [];
        optionsList.find('li.selected input[type="checkbox"]').each(function(){
            vals.push( $(this).val() );
        });
        select.val( vals ).trigger('change');

        instance.updateSelectAll   = true;
        instance.updatePlaceholder = true;

        // USER CALLBACK
        if( typeof instance.options.onSelectAll == 'function' ) {
            instance.options.onSelectAll( instance.element, vals.length );
        }

        instance._updateSelectAllText();
        if (instance.options.serverSide)
            instance._updatePlaceholderText(groupCounter);
        else
            instance._updatePlaceholderText();

    }


    function selectAllOptions(instance, unselect){
        var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
        var optionsList = optionsWrap.find('> ul');
        event.preventDefault();
        instance.updateSelectAll   = false;
        instance.updatePlaceholder = false;
        var groupCounter = null
        var select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');


        // check if any options are not selected if so then select them
        if(!unselect) {
            // get unselected vals, mark as selected, return val list
            if (instance.options.serverSide) selectServersideAllOptions(instance, optionsList)
            optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').closest('li').addClass('selected');
            optionsList.find('li.selected input[type="checkbox"]:not(:disabled)').prop( 'checked', true );
        }
        // deselect everything
        else {
            if (instance.options.serverSide) unselectServersideAllOptions(instance, optionsList)
            optionsList.find('li:not(.optgroup, .ms-hidden).selected input[type="checkbox"]:not(:disabled)').closest('li').removeClass('selected');
            optionsList.find('li:not(.optgroup, .ms-hidden, .selected) input[type="checkbox"]:not(:disabled)').prop( 'checked', false );
        }

        var vals = [];
        optionsList.find('li.selected input[type="checkbox"]').each(function(){
            vals.push( $(this).val() );
        });
        select.val( vals ).trigger('change');

        instance.updateSelectAll   = true;
        instance.updatePlaceholder = true;

        // USER CALLBACK
        if( typeof instance.options.onSelectAll == 'function' ) {
            instance.options.onSelectAll( instance.element, vals.length );
        }

        instance._updateSelectAllText();
        if (instance.options.serverSide)
            instance._updatePlaceholderText(groupCounter);
        else
            instance._updatePlaceholderText();


    }


    function toggleServersideOption(instance, option){
        id = option.attr("value")
        const index = instance.options.serverSideParameters.selectedOptionsId.indexOf(id);


        if (index === -1) {
            selectServersideOption(instance, option);
        }else{
            unselectServersideOption(instance, option);
        }

        instance._updatePlaceholderText();
    }


    function insertRetrievedDataSelected(instance, option){
        let optionData = {
            "name":option.attr("title"),
            "value":option.attr("value"),
            "checked": option.closest('li:not(.optgroup, .ms-hidden)').hasClass("selected"),
            "attributes":{
                "disabled": option.attr('disabled') ? "disabled" : false,
            },
        }
        var groupElement =option.closest('li.optgroup')

        let groupData = {
            "label":groupElement.find("> span.label").text(),
            "attributes":{
                "data-group-id":groupElement.attr("data-group-id"),
                "data-group-counter":groupElement.attr("data-group-counter"),
                "selectAll":groupElement.attr("selectall")
            },
            "options":[optionData]


        }
        has_group = false

        $.each(instance.options.serverSideParameters.optionsData, function(index, element) {
            if (element['label']==groupData['label']) {
                has_group = true
                if (!(element.options.filter(e => e.value === optionData.value).length > 0)) {
                    instance.options.serverSideParameters.optionsData[index].options.push(optionData)
                }

            }
        });

        if (!has_group){
            instance.options.serverSideParameters.optionsData.push(groupData)
        }

        // console.log("has instance.options.serverSideParameters.optionsData")
        // console.log(JSON.stringify( instance.options.serverSideParameters.optionsData, null, 2))
    }

    function removeRetrievedDataSelected(instance, option){
        let optionData = {
            "name":option.attr("title"),
            "value":option.attr("value"),
            "checked": option.closest('li:not(.optgroup, .ms-hidden)').hasClass("selected"),
            "attributes":{
                "disabled": option.attr('disabled') ? "disabled" : false,
            },
        }
        var groupElement =option.closest('li.optgroup')

        let groupData = {
            "label":groupElement.find("> span.label").text(),
            "attributes":{
                "data-group-id":groupElement.attr("data-group-id"),
                "data-group-counter":groupElement.attr("data-group-counter"),
                "selectAll":groupElement.attr("selectall")
            },
            "options":[optionData]


        }

        $.each(instance.options.serverSideParameters.optionsData, function(index, element) {
            if (element['label']==groupData['label']) {
                has_group = true
                if ((element.options.filter(e => e.value === optionData.value).length > 0)) {
                    let index_option = null;
                    instance.options.serverSideParameters.optionsData[index].options.map(function(item, i){
                        if (item.value == optionData.value) index_option = i
                    })

                    if (index_option!=null)
                        instance.options.serverSideParameters.optionsData[index].options.splice(index_option, 1)
                }

            }
        });


        // console.log("instance.options.serverSideParameters.optionsData")
        // console.log(JSON.stringify( instance.options.serverSideParameters.optionsData, null, 2))
    }


    function selectServersideOption(instance, option){
        insertRetrievedDataSelected(instance, option)
        var value = null
        if ($.isNumeric(option))
            value = option;
        else
            value =option.attr("value")
        const index = instance.options.serverSideParameters.selectedOptionsId.indexOf(value);
        if (index === -1) {
            instance.options.serverSideParameters.selectedOptionsId.push(value);
        }
    }

    function unselectServersideOption(instance, option){
        removeRetrievedDataSelected(instance, option)
        var value = null
        if ($.isNumeric(option))
            value = option;
        else
            value =option.attr("value")
        const index = instance.options.serverSideParameters.selectedOptionsId.indexOf(value);
        if (index > -1) {
            instance.options.serverSideParameters.selectedOptionsId.splice(index, 1);
        }
    }

    function selectServersideAllOptions(instance, optionsList){
        optionsList.find('li:not(.optgroup, .selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').each(function() {
            selectServersideOption(instance,$(this))
        });

    }
    function unselectServersideAllOptions(instance, optionsList){
        optionsList.find('li:not(.optgroup, .ms-hidden).selected input[type="checkbox"]:not(:disabled)').each(function() {
            unselectServersideOption(instance,$(this))
        });

    }

    function selectServersideGroup(instance, optgroup){
        optgroup.find('li:not(.selected, .ms-hidden) input[type="checkbox"]:not(:disabled)').each(function() {
            selectServersideOption(instance,$(this))
        });

    }
    function unselectServersideGroup(instance, optgroup){
        optgroup.find('li:not(.ms-hidden).selected input[type="checkbox"]:not(:disabled)').each(function() {
            unselectServersideOption(instance,$(this))
        });

    }
    function updateInputsWithSelectedData(instance){
        var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
        unselectList = []
        $.each(instance.options.serverSideParameters.selectedOptionsId, function(index, element) {
            let optionInput = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('input[type="checkbox"][value="'+element+'"]')
            if (optionInput.length > 0) {
                if (optionInput.attr("disabled")=="disabled"){
                    unselectList.push(optionInput)
                }
                else {
                    optionInput.prop("checked", true);
                    optionInput.closest('li').addClass('selected');
                    var select = optionsWrap.parent().siblings('.ms-list-' + instance.listNumber + '.jqmsLoaded');
                    select.find('option[value="' + instance._escapeSelector(optionInput.val()) + '"]').prop(
                        'selected', optionInput.is(':checked')
                    ).closest('select').trigger('change');
                }
            }

        });
        // need to unselect outside the foreach above to prevent change array while foreach iterate through it
        $.each(unselectList, function(index, element) {
            unselectServersideOption(instance, element)
        });
         instance._updatePlaceholderText();
         validatePayload();
    }

    function updateSelectedListWithBackendData(instance, useFavorite = false){
         var optionsWrap = $(instance.element).siblings('#ms-list-'+ instance.listNumber +'.ms-options-wrap').find('> .ms-options');
        if (useFavorite){
             serverSideGetData(instance, optionsWrap, null, false, null, false, instance.options.serverSideParameters.selectedOptionsId, useFavorite)
        }
        else if (instance.options.serverSideParameters.selectedOptionsId.length > 0){
            serverSideGetData(instance, optionsWrap, null, false, null, false, instance.options.serverSideParameters.selectedOptionsId, false)
        }

    }

    function serverSideGetData(instance, optionsWrap, search, retrieve_all_data = false, group_id = null, unselect = false, selectedDataToUpdate, useFavorite = false){
        var overwrite = false;
        if (search || (search == '')) {
            if (instance.options.serverSideParameters.params.search != search){
                instance.options.serverSideParameters.params.search = search
                instance.options.serverSideParameters.search_current_page=1;
                instance.options.serverSideParameters.current_page=1;
                overwrite = true;
            }
        }

        if (!instance.options.hasAllOptions) {
            $(instance.element).data("loading", true);
            startLoader("#loader-" + $(instance.element).attr("id"));
            instance.options.serverSideParameters.params.groupData = instance.options.data;
            if (search) {
                instance.options.serverSideParameters.params.search = search;
                instance.options.serverSideParameters.params.page = instance.options.serverSideParameters.search_current_page;
            } else {
                instance.options.serverSideParameters.params.page = instance.options.serverSideParameters.current_page;
            }

            let url = instance.options.serverSideParameters.url;
            let csrftoken = instance.options.serverSideParameters.csrftoken;
            let params = instance.options.serverSideParameters.params;

            let dependenceData = {filter_data: {}};
            dependenceData = instance.options.serverSideParameters.params.payload_data_function($(instance.element), dependenceData)
            let data = dependenceData.data
            let waitDependences = dependenceData.waitDependences

            // Dependences
            params.config_id = $(instance.element).attr('data-id')
            params.dependences_values = {}

            $(instance.element).attr('dependences').split(',').forEach((dependence_config_id, i) => {
                params.dependences_values[dependence_config_id] = $('#filter-' + dependence_config_id).val()
            });

            if (group_id != null)
                data.group_id = group_id;

            if (!retrieve_all_data && (!search) ){
                data.page = params.page;
            }
            else
                data.page = -1;

            if (selectedDataToUpdate)
                data.old_selected_data = selectedDataToUpdate;

            if (useFavorite){
                select = optionsWrap.parent().siblings('.ms-list-'+ instance.listNumber +'.jqmsLoaded');
                data.favorite_id = parseInt(select.attr('favorite'));
            }

            data.term = params.search;
            // let post_data = JSON.stringify(params)
            let post_data = JSON.stringify(data)
            $.ajax({
                url: url,
                method: "POST",
                data: post_data,
                async: true,
                contentType: "application/json",
                beforeSend: function (xhr, settings) {
                    if (csrftoken != null) {
                        xhr.setRequestHeader("X-CSRFToken", csrftoken);
                    }
                },
                success: function (response) {
                    if (selectedDataToUpdate){
                        instance.options.serverSideParameters.selectedOptionsId = response.options

                        updateInputsWithSelectedData(instance)
                    }
                    else {
                        if (retrieve_all_data && !search)
                            instance.options.hasAllOptions = true;
                        $("#loader-server-side").remove();
                        // let update = search ? true : false;
                        let option_test = formatOptions(response);
                        instance.loadOptions(option_test, overwrite, true);
                        if (response.options.length > response.results_per_page) {
                            let sum_pages = Math.floor(response.options.length / response.results_per_page)
                            instance.options.serverSideParameters.current_page = instance.options.serverSideParameters.current_page + sum_pages
                        } else {
                            if (search) {
                                hasAllOptions = true;
                                instance.options.serverSideParameters.search_current_page++;
                            } else {
                                instance.options.serverSideParameters.current_page++;
                            }
                        }
                        var load_more_flag = true; // to avoid multiple loadings at the same time
                        $(optionsWrap).scroll(function () {
                            let more = false
                            if (group_id != null)
                                more = true
                            else {
                                more = response.results_per_page <= response.options.length
                                more = response.options.length > 0
                            }

                            if (more === true) {
                                if (!instance.options.hasAllOptions) {
                                    var scrollHeight = $(this).prop('scrollHeight');
                                    var divHeight = $(this).height();
                                    var scrollerEndPoint = scrollHeight - divHeight;
                                    var margin = 5 / 100 * scrollerEndPoint
                                    var divScrollerTop = $(this).scrollTop();
                                    if (divScrollerTop > (scrollerEndPoint - margin) && load_more_flag) {
                                        load_more_flag = false;
                                        var loader = $('<p/>').html(
                                            instance.options.serverSideParameters.loaderText)
                                            .addClass("ms-options-gray-color")
                                            .prop("id", "loader-server-side")
                                            .css("margin-left", "5px");
                                        if (!$("#loader-server-side").length) {
                                            $(optionsWrap).append(loader);
                                        }
                                        setTimeout(function () {
                                            serverSideGetData(instance, optionsWrap);
                                        }, 500);
                                    }
                                }
                            } else {
                                $(optionsWrap).off('scroll');
                            }
                        });

                        $("#loader-server-side").remove();
                        if (retrieve_all_data)
                            selectAllOptions(instance, unselect)
                        if (group_id != null)
                            selectGroupAllOptions(instance, group_id, unselect)

                        updateInputsWithSelectedData(instance)
                        $(instance.element).data("loading", false);
                        stopLoader("#loader-" + $(instance.element).attr("id"));
                    }
                },
                error: function (xhr) {
                    //Do Something to handle error
                }
            });
        }
    }
}(jQuery));
