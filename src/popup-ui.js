import { readOverrides, saveOverride, removeOverride, createOverride } from "./popup.js";

import { h, render } from "preact";
import { useComputed, useSignal } from "@preact/signals";
import htm from "htm";

const html = htm.bind(h);

let refresh = () => {}; // dummy function until the popup renders

const OverrideItem = (props) => {
  const { name, obj } = props;
  const overrideUrl = useSignal(obj.url);
  const enabled = useSignal(obj.enabled);

  const blank = useComputed(() => !overrideUrl.value.trim());

  const save = () => {
    saveOverride({
      name,
      url: overrideUrl.peek(),
      enabled: enabled.peek(),
    });
  };

  const remove = async () => {
    await removeOverride(name);
    refresh();
  }

  const onTextbox = (e) => {
    e.currentTarget.value = e.currentTarget.value.trim();
    overrideUrl.value = e.currentTarget.value;
  };

  const onCheckbox = (e) => {
    enabled.value = e.currentTarget.checked;
    save();
  };

  return html`
    <li>
      <label>${name}</label>
      <button onClick=${remove}>❌</button>
      <input
        type=text
        autocomplete=url
        defaultValue=${overrideUrl}
        onInput=${onTextbox}
        onChange=${save}
      />
      <input
        type=checkbox
        checked=${enabled}
        disabled=${blank}
        indeterminate=${blank}
        onChange=${onCheckbox}
      />
    </li>
  `;
};

export const Popup = () => {
  const overrides = useSignal(null);
  const pendingName = useSignal(null);
  refresh = () => readOverrides().then(v => overrides.value = v);
  if (overrides.value === null) {
    refresh();
    return '';
  }

  const addEntry = () => pendingName.value = '';
  const commitEntry = async () => {
    await createOverride(pendingName.value);
    pendingName.value = null;
    refresh();
  };
  const onTextbox = (e) => {
    e.currentTarget.value = e.currentTarget.value.trim();
    pendingName.value = e.currentTarget.value;
  };

  const entryAddUI = pendingName.value === null
    ? html`<button onClick=${addEntry}>➕</button>`
    : html`
      <input type=text onInput=${onTextbox} />
      <button onClick=${commitEntry}>✔️</button>
    `;

  return html`
    <ul>
      ${Object.entries(overrides.value).map(([name, obj]) => h(OverrideItem, { name, obj }))}
    </ul>
    ${entryAddUI}
  `;
};

render(h(Popup), document.body);
