
/**********************************************************************************************************************
 *  Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.                                           *
 *                                                                                                                    *
 *  Licensed under the Apache License, Version 2.0 (the License). You may not use this file except in compliance    *
 *  with the License. A copy of the License is located at                                                             *
 *                                                                                                                    *
 *      http://www.apache.org/licenses/LICENSE-2.0                                                                    *
 *                                                                                                                    *
 *  or in the 'license' file accompanying this file. This file is distributed on an 'AS IS' BASIS, WITHOUT WARRANTIES *
 *  OR CONDITIONS OF ANY KIND, express or implied. See the License for the specific language governing permissions    *
 *  and limitations under the License.                                                                                *
 *********************************************************************************************************************/

import React, { useState, useEffect, useRef } from 'react'

import Button, { BUTTON_PALETTES } from '../../components/Button/Button'
import Card from '../../components/Card/Card'
import DocumentList from '../../components/DocumentList/DocumentList'
import FeatureTooltip from '../../components/FeatureTooltip/FeatureTooltip'
import FormInput from '../../components/FormInput/FormInput'
import Highlight from '../../components/Highlight/Highlight'
import Loading from '../../components/Loading/Loading'
import Pager from '../../components/Pager/Pager'
import SearchResults from '../../components/SearchResults/SearchResults'
import Tabs from '../../components/Tabs/Tabs'

import { searchResults } from '../../constants/test-data'

import css from './styleguide.module.scss'

Styleguide.getInitialProps = function() {
  return {
    pageTitle: 'Styleguide',
  }
}

function Styleguide() {
  const {
    typeRefs: { h1, h2, h3, h4, h5, lead, primary, secondary, small },
    typeSizes: {
      h1Size,
      h2Size,
      h3Size,
      h4Size,
      h5Size,
      leadSize,
      primarySize,
      secondarySize,
      smallSize,
    },
  } = useTypeResizer()
  const colorClasses = Object.keys(css).filter(className => className.indexOf('color-') === 0)

  return (
    <div>
      <h2>Styleguide</h2>

      <section>
        <h3>Typography</h3>
        <p>
          Use the mixins in <code>app/styles/shared/_typography.scss</code> to apply type styles to
          an element.
        </p>

        <pre>
          <code>{`
@import '../styles/shared/index';

.custom-heading {
  @include type-heading-h1;
}

.white-heading {
  @include type-heading-h1(color(white)); // color override
}

`}</code>
        </pre>

        <hr />

        <h4>Heading Mixin Samples</h4>
        <h1 ref={h1}>H1, {h1Size} Ember Bold (type-heading-h1)</h1>
        <h2 ref={h2}>H2, {h2Size} Ember Medium (type-heading-h2)</h2>
        <h3 ref={h3}>H3, {h3Size} Ember Regular (type-heading-h3)</h3>
        <h4 ref={h4}>H4, {h4Size} Ember Bold (type-heading-h4)</h4>
        <h5 ref={h5}>H5, {h5Size} Ember Bold (type-heading-h5)</h5>

        <hr />

        <h4>Body Mixin Samples</h4>
        <p className={css.lead} ref={lead}>
          P, {leadSize} Ember Regular (type-body-lead)
        </p>
        <p className={css.primary} ref={primary}>
          P, {primarySize} Ember Regular (type-body-primary)
        </p>
        <p className={css.supplemental} ref={secondary}>
          P, {secondarySize} Ember Regular (type-body-secondary)
        </p>
        <p className={css.small} ref={small}>
          P, {smallSize} Ember Bold (type-body-supplemental)
        </p>

        <hr />
      </section>

      <section>
        <h3>Colors</h3>
        <p>
          Use the <code>color</code> function defined in <code>app/styles/shared/_colors.scss</code>
          . Do not use hard-coded hex codes or rgb/hsl values.
        </p>

        <pre>
          <code>{`
@import '../styles/shared/colors';

.some-element {
  background: color(blue);
  color: color(blue, 10);
}

`}</code>
        </pre>

        <p>
          It is considered better practice to assign colors to semantic variables instead of as
          direct values of a property.
        </p>

        <pre>
          <code>{`
@import '../styles/shared/colors';

$button-border-color: color(blue);

.button {
  border-color: $button-border-color;
}

`}</code>
        </pre>

        <ul className={css.colors}>
          {colorClasses.map(colorClass => {
            return (
              <li className={css[colorClass]} key={colorClass}>
                <span>
                  {colorClass
                    .replace('color-', '')
                    .replace('-core', '')
                    .replace('-', ' ')}
                </span>
              </li>
            )
          })}
        </ul>
      </section>

      <section>
        <h2>Grids</h2>

        <p>
          This site uses{' '}
          <a href="http://oddbird.net/susy/" target="_blank">
            Susy 3.0
          </a>{' '}
          for grids. There is no site-wide grid system that all items adhere to. Instead, Susy
          provides a few helper functions that return widths of colspans and gutters. There are
          intentionally no global classes or markup schemes to aid in creating grids — these are
          usually too rigid and require lots of unnecessary markup to get things working. The grid
          configs and mixins for common layouts can be found in{' '}
          <code>{`app/styles/shared/_grids.scss`}</code>
        </p>

        <div className={css.grid} />
      </section>

      <section className={css.buttons}>
        <h2>Buttons</h2>
        <p>
          Use the <code>{`palette`}</code> prop to change the button color. Available palette
          values: {BUTTON_PALETTES.join(', ')}. The default palette is orange. NOTE: Buttons have a
          min-width set.
        </p>
        <div>
          <h3>Primary</h3>
          <p>
            <code>{`inverted={false}`}</code> (default)
          </p>

          {BUTTON_PALETTES.map(palette => (
            <p key={palette}>
              <Button link={{ href: '#' }} palette={palette}>
                Sample Button
              </Button>
              <Button link={{ href: '#' }} palette={palette}>
                ...
              </Button>
            </p>
          ))}

          <p>
            <code>{`disabled={true}`}</code>
          </p>
          <p>
            <Button link={{ href: '#' }} disabled>
              Sample Button
            </Button>
            <Button link={{ href: '#' }} disabled>
              ...
            </Button>
          </p>
        </div>

        <div>
          <h3>Secondary</h3>
          <p>
            <code>{`inverted={true}`}</code>
          </p>

          {BUTTON_PALETTES.map(palette => (
            <p key={palette}>
              <Button link={{ href: '#' }} inverted palette={palette}>
                Sample Button
              </Button>
              <Button link={{ href: '#' }} inverted palette={palette}>
                ...
              </Button>
            </p>
          ))}

          <p>
            <code>{`disabled={true}`}</code>
          </p>
          <p>
            <Button link={{ href: '#' }} inverted disabled>
              Sample Button
            </Button>
            <Button link={{ href: '#' }} inverted disabled>
              ...
            </Button>
          </p>
        </div>

        <div>
          <h3>Simple</h3>
          <p>The inverted prop is ignored for simple buttons.</p>

          <p>
            <code>{`simple={true}`}</code>
          </p>
          <p>
            {BUTTON_PALETTES.map(palette => (
              <Button key={palette} link={{ href: '#' }} simple palette={palette}>
                Sample Button
              </Button>
            ))}
          </p>

          <p>
            <code>{`disabled={true}`}</code>
          </p>
          <p>
            <Button link={{ href: '#' }} simple disabled>
              Sample Button
            </Button>
          </p>
        </div>

        <div>
          <h3>With Icons</h3>

          <p>
            {BUTTON_PALETTES.map(palette => (
              <Button key={palette} link={{ href: '#' }} simple palette={palette}>
                <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="m15.4076667 4.52484732h-6.05924085v-2.56410764c0-1.67321315 1.35640725-3.0296204 3.02962045-3.0296204 1.6732131 0 3.0296204 1.35640725 3.0296204 3.0296204zm0 1.12134639v14.53506789l-2.2482447 4.9740929c-.227471.5032647-.8198494.7268396-1.3231141.4993686-.2356073-.1064924-.4208099-.3001023-.5167445-.5402022l-1.97113755-4.9332593v-14.53506789z"
                    fillRule="evenodd"
                    transform="matrix(.70710678 .70710678 -.70710678 .70710678 12.349321 -5.139053)"
                  />
                </svg>
                <span>Sample Button</span>
              </Button>
            ))}
          </p>

          <p>
            {BUTTON_PALETTES.map(palette => (
              <Button key={palette} link={{ href: '#' }} simple palette={palette}>
                <span>Sample Button</span>
                <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="m15.4076667 4.52484732h-6.05924085v-2.56410764c0-1.67321315 1.35640725-3.0296204 3.02962045-3.0296204 1.6732131 0 3.0296204 1.35640725 3.0296204 3.0296204zm0 1.12134639v14.53506789l-2.2482447 4.9740929c-.227471.5032647-.8198494.7268396-1.3231141.4993686-.2356073-.1064924-.4208099-.3001023-.5167445-.5402022l-1.97113755-4.9332593v-14.53506789z"
                    fillRule="evenodd"
                    transform="matrix(.70710678 .70710678 -.70710678 .70710678 12.349321 -5.139053)"
                  />
                </svg>
              </Button>
            ))}
          </p>

          <p>
            {BUTTON_PALETTES.map(palette => (
              <Button key={palette} link={{ href: '#' }} palette={palette}>
                <span>Sample Button</span>
                <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                  <path
                    d="m15.4076667 4.52484732h-6.05924085v-2.56410764c0-1.67321315 1.35640725-3.0296204 3.02962045-3.0296204 1.6732131 0 3.0296204 1.35640725 3.0296204 3.0296204zm0 1.12134639v14.53506789l-2.2482447 4.9740929c-.227471.5032647-.8198494.7268396-1.3231141.4993686-.2356073-.1064924-.4208099-.3001023-.5167445-.5402022l-1.97113755-4.9332593v-14.53506789z"
                    fillRule="evenodd"
                    transform="matrix(.70710678 .70710678 -.70710678 .70710678 12.349321 -5.139053)"
                  />
                </svg>
              </Button>
            ))}
          </p>

          <p>
            <code>{`disabled={true}`}</code>
          </p>
          <p>
            <Button link={{ href: '#' }} simple disabled>
              Sample Button
              <svg height="24" viewBox="0 0 24 24" width="24" xmlns="http://www.w3.org/2000/svg">
                <path
                  d="m15.4076667 4.52484732h-6.05924085v-2.56410764c0-1.67321315 1.35640725-3.0296204 3.02962045-3.0296204 1.6732131 0 3.0296204 1.35640725 3.0296204 3.0296204zm0 1.12134639v14.53506789l-2.2482447 4.9740929c-.227471.5032647-.8198494.7268396-1.3231141.4993686-.2356073-.1064924-.4208099-.3001023-.5167445-.5402022l-1.97113755-4.9332593v-14.53506789z"
                  fillRule="evenodd"
                  transform="matrix(.70710678 .70710678 -.70710678 .70710678 12.349321 -5.139053)"
                />
              </svg>
            </Button>
          </p>
        </div>
      </section>

      <section>
        <h2>Form Controls</h2>

        <h3>Single Line Text Inputs</h3>
        <p>
          <FormInput label="Default text input" defaultValue="Some default value" />
        </p>
        <p>
          <FormInput label="Disabled text input" defaultValue="Some default value" disabled />
        </p>
        <p>
          <FormInput label="Erroneous text input" defaultValue="Some default value" error />
        </p>

        <hr />

        <h3>Multi Line Text Inputs</h3>
        <p>
          <FormInput
            type="textarea"
            label="Default textarea input"
            defaultValue="Some default value"
          />
        </p>
        <p>
          <FormInput
            type="textarea"
            label="Disabled textarea input"
            defaultValue="Some default value"
            disabled
          />
        </p>
        <p>
          <FormInput
            type="textarea"
            label="Erroneous textarea input"
            defaultValue="Some default value"
            error
          />
        </p>

        <hr />

        <h3>Search Inputs</h3>
        <p>
          <FormInput type="search" defaultValue="Search term..." />
        </p>

        <hr />

        <h3>Checkbox Inputs</h3>
        <p>
          <FormInput type="checkbox" label="Default checkbox" />
        </p>
        <p>
          <FormInput type="checkbox" label="Disabled checkbox" disabled />
        </p>
        <p>
          <FormInput type="checkbox" label="Erroneous checkbox" error />
        </p>

        <hr />

        <h3>Radio Inputs</h3>
        <p>
          <FormInput type="radio" label="Default radio" />
        </p>
        <p>
          <FormInput type="radio" label="Disabled radio" disabled />
        </p>
        <p>
          <FormInput type="radio" label="Erroneous radio" error />
        </p>
      </section>

      <section>
        <h2>Tables</h2>

        <table>
          <thead>
            <tr>
              <th>Key</th>
              <th>Value</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>some-key</td>
              <td>some-value</td>
            </tr>
            <tr className="selected">
              <td>some-selected-key</td>
              <td>some-selected-value</td>
            </tr>
            <tr>
              <td>some-key</td>
              <td>some-value</td>
            </tr>
            <tr>
              <td>some-key</td>
              <td className="selected">some-selected-value</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section>
        <h2>Document List</h2>

        <DocumentList
          items={[
            { title: 'Document-Name_1.pdf', link: { href: '#' } },
            { title: 'Document-Name_2.pdf', link: { href: '#' }, pending: true },
            { title: 'Document-Name_3.pdf', link: { href: '#' } },
            { title: 'Document-Name_4.pdf', link: { href: '#' } },
            { title: 'Document-Name_5.pdf', link: { href: '#' } },
          ]}
        />
      </section>

      <section>
        <h2>Cards</h2>

        <h3>Without Icons</h3>
        <Card title="Black Card Title" subtitle="This is the subtitle." />
        <hr />
        <Card title="Blue Card Title" palette="blue" subtitle="This is the subtitle." />
        <hr />
        <Card title="Teal Card Title" palette="teal" subtitle="This is the subtitle." />
        <hr />
        <Card title="Purple Card Title" palette="purple" subtitle="This is the subtitle." />

        <hr />

        <h3>With Icons</h3>
        <Card
          palette="blue"
          icon={<img src="/images/icon_cloud-search.svg" />}
          title="Conduct a search"
          subtitle="Find keys, values and words across the documents."
        />
        <hr />
        <Card
          palette="teal"
          icon={<img src="/images/icon_redact.svg" />}
          title="Make redactions"
          subtitle="Redact values (names, SS#s etc) across these documents."
        />
        <hr />
        <Card
          palette="purple"
          icon={<img src="/images/icon_workflow.svg" />}
          title="Open a document"
          subtitle="Chose a document on the left to see how it was formatted."
        />

        <hr />

        <h3>Different Sizes</h3>
        <Card title="Loud card" subtitle="Bigger is sometimes better" volume="loud" />
        <hr />
        <Card title="Conversational card" subtitle="Default state" volume="conversational" />
        <hr />
        <Card title="Quiet card" subtitle="Just a whisper will do" volume="quiet" />
      </section>

      <section>
        <h2>Loading Spinner</h2>

        <p>
          The spinner overlays/fills its closest <em>positioned</em> container, and covers it with a
          semi-transparent background. Its default size is {Loading.defaultProps.size}px.
        </p>
        <div className={css.loading}>
          <p>This is some content inside the filled container.</p>
          <Loading />
        </div>

        <p>
          The size prop allows you to change the size of the spinner: <code>{`size={50}`}</code>
        </p>
        <div className={css.loading}>
          <p>This is some content inside the filled container.</p>
          <Loading size={50} />
        </div>

        <p>
          You can turn of the overlay effect by setting <code>{`overlay={false}`}</code>
        </p>
        <div className={css.loading}>
          <p>This is some content inside the unfilled container.</p>
          <Loading overlay={false} />
        </div>
      </section>

      <section>
        <h2>Feature Tooltip</h2>
        <FeatureTooltip
          title="Some cool feature"
          description="This is a longer description of what the feature is, how it works, and why it's so cool."
        />
      </section>

      <section>
        <h2>Tabs</h2>
        <Tabs
          items={[
            { id: 'text', title: 'Text', content: <div>Text Contents</div> },
            { id: 'forms', title: 'Forms', content: <div>Forms Contents</div> },
            { id: 'tables', title: 'Tables', content: <div>Tables Contents</div> },
            { id: 'source', title: 'Source', content: <div>Source Contents</div> },
          ]}
          defaultActiveTabId="text"
        />
      </section>

      <section>
        <h2>Pager</h2>
        <Pager pageTotal={4}>
          {currentPageNumber => <p>Page {currentPageNumber} paragraph</p>}
        </Pager>
      </section>

      <section>
        <h2>Highlight</h2>
        <p>
          <Highlight search="brown fox">The quick brown fox jumps over the lazy dog...</Highlight>
        </p>
      </section>

      <section>
        <h2>SearchResults</h2>
        <SearchResults results={searchResults} searchQuery="foreign" searchStatus="success" />
      </section>
    </div>
  )
}

function useTypeResizer() {
  const h1 = useRef(null)
  const h2 = useRef(null)
  const h3 = useRef(null)
  const h4 = useRef(null)
  const h5 = useRef(null)
  const lead = useRef(null)
  const primary = useRef(null)
  const secondary = useRef(null)
  const small = useRef(null)

  const [h1Size, setH1Size] = useState(0)
  const [h2Size, setH2Size] = useState(0)
  const [h3Size, setH3Size] = useState(0)
  const [h4Size, setH4Size] = useState(0)
  const [h5Size, setH5Size] = useState(0)
  const [leadSize, setLeadSize] = useState(0)
  const [primarySize, setPrimarySize] = useState(0)
  const [secondarySize, setSecondarySize] = useState(0)
  const [smallSize, setSmallSize] = useState(0)

  useEffect(() => {
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  function handleResize() {
    setH1Size(getFontSize(h1.current))
    setH2Size(getFontSize(h2.current))
    setH3Size(getFontSize(h3.current))
    setH4Size(getFontSize(h4.current))
    setH5Size(getFontSize(h5.current))
    setLeadSize(getFontSize(lead.current))
    setPrimarySize(getFontSize(primary.current))
    setSecondarySize(getFontSize(secondary.current))
    setSmallSize(getFontSize(small.current))
  }

  function getFontSize(element) {
    return parseInt(getComputedStyle(element)['font-size'], 10)
  }

  return {
    typeRefs: {
      h1,
      h2,
      h3,
      h4,
      h5,
      lead,
      primary,
      secondary,
      small,
    },
    typeSizes: {
      h1Size,
      h2Size,
      h3Size,
      h4Size,
      h5Size,
      leadSize,
      primarySize,
      secondarySize,
      smallSize,
    },
  }
}

export default Styleguide
