# Core Tags

## `<if>` / `<else>`

The `<if>` and `<else>` control flow tags are used to conditionally display content or apply [attribute tags](./language.md#attribute-tags).

An `<if>` is applied when its `value=` attribute ([shorthand used below](./language.md#shorthand-value)) is [truthy](https://developer.mozilla.org/en-US/docs/Glossary/Truthy) and may be followed by an `<else>`.

The `<else>` tag may have its own condition as an `if=` attribute.
When it has a condition, the condition is checked before the `<else>` is applied and another `<else>` may follow.

Expressions in the if/else chain are evaluated in order.

```marko
<if=EXPRESSION>
  Body A
</if>
<else if=ANOTHER_EXPRESSION>
  Body B
</else>
<else>
  Body C
</else>
```

## `<for>`

The `<for>` control flow tag allows for writing content or applying [attribute tags](./language.md#attribute-tags) while iterating. Its [content](./language.md#tag-content) has access to information about each iteration through the [Tag Parameters](./language.md#tag-parameters).

The `<for>` tag can iterate over:

- Arrays and [Iterables](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Iteration_protocols#the_iterable_protocol) with the `of=` attribute

  ```marko
  <for|item, index| of=["a", "b", "c"]>
    ${index}: ${item}
  </for>
  ```

- Object properties and values with the `in=` attribute

  ```marko
  <for|key, value| in={a: 1, b: 2, c: 3}>
    ${key}: ${value}
  </for>
  ```

- **Exclusive** ranges of numbers with the `until=`, `from=`, and `step=` attributes

  ```marko
  <for|num| until=5>${num}</for>
  // 0 1 2 3 4

  <for|num| from=3 until=7>${num}</for>
  // 3 4 5 6

  <for|num| from=2 until=10 step=2>${num}</for>
  // 2 4 6 8
  ```

- **Inclusive** ranges of numbers with the `to=`, `from=`, and `step=` attributes

  ```marko
  <for|num| to=5>${num}</for>
  // 0 1 2 3 4 5

  <for|num| from=3 to=7>${num}</for>
  // 3 4 5 6 7

  <for|num| from=2 to=10 step=2>${num}</for>
  // 2 4 6 8 10
  ```

The `<for>` tag has a `by=` attribute which helps preserve state while reordering content within the loop. The value should be a function (which receives the same parameters as the loop itself) that is used to give each iteration a unique key.

```marko
<for|user| of=users by=user => user.id>
  ${user.firstName} ${user.lastName}
</for>
```

The `by=` attribute above keys each iteration by its `user.id` property.

Additionally, when using the `of=` attribute, `by=` may be a string. This will key the items by the corresponding property on each item.

This means the previous example can simplified to:

```marko
<for|user| of=users by="id">
  ${user.firstName} ${user.lastName}
</for>
```

## `<let>`

The `<let>` tag introduces mutable state through its [Tag Variable](./language.md#tag-variables).

```marko
<let/x=1>
```

The `value=` attribute (usually with a [shorthand](./language.md#shorthand-value)) provides an initial value for its state.

When a tag variable is updated, everywhere it is used also re-runs. This is the core of Marko's reactive system.

```marko
<let/count=1>

<button onClick() { count++ }>
  Current count: ${count}
</button>
```

In this template, `count` is incremented when the button is clicked. Since `count` is a [Tag Variable](./language.md#tag-variables), it will cause any downstream expression (in this case the text in the button) to be updated every time it changes.

> [!NOTE]
> The `<let>` tag is not reactive to changes in its `value=` attribute unless it is [controllable](#controllable-let). Its tag variable updates only through direct assignment or its change handler.
>
> ```marko
> export interface Input {
>   initialCount: number;
> }
>
> <let/count=input.initialCount>
> <p>Count: ${count}</p>
> <p>Input Count: ${input.initialCount}</p>
> ```
>
> Here, even if `input.initialCount` changes, `count` remains at its initial value.

### Controllable Let

The `<let>` tag can be made **controllable** using its `valueChange=` attribute, similarly to [native tag change handlers](./native-tag.md#change-handlers). This enables interception and transformation of state changes, or synchronization of state between parent and child components.

```marko
<let/value="HELLO">
<let/controlled_value=value valueChange(newValue) { value = newValue.toUpperCase() }>
```

In this example:

1. `value` holds the base state with an initial value of "HELLO"
2. `controlled_value` reflects the value of `value`, but its `valueChange` handler ensures all updates are uppercase
3. Any changes to `controlled_value` are intercepted, transformed to uppercase, and stored in `value`

A more common use case is creating state that can be optionally controlled by a parent component:

```marko
/* counter.marko */
export interface Input {
  count: number;
  countChange?: (count: number) => void;
}

<let/count:=input.count>

<button onClick() { count++ }>
  Clicked ${count} times
</button>
```

This creates two possible behaviors:

1. **Uncontrolled**: If the parent only provides `count=`, the child maintains its own state:

   ```marko
   <counter count=0/>
   ```

2. **Controlled**: If the parent provides both `count=` and `countChange=`, the parent takes control of the state:

   ```marko
   <let/count=0>
   <counter count:=count/>
   <button onClick() { count = 0 }>
     Reset
   </button>
   ```

## `<const>`

The `<const>` exposes its `value=` attribute (usually with a [shorthand](./language.md#shorthand-value)) through its [Tag Variable](./language.md#tag-variables).

Extending the [`<let>`](#let) example we could derive data from the `count` state like so:

```marko
<let/count=1>
<const/doubleCount=count * 2>

<button onClick() { count++ }>
  Current count: ${count}
  And the double is ${doubleCount}
</button>
```

> [!NOTE]
> The `<const>` tag is locally scoped and will be initialized for every instance of a component. If your goal is to expose a program wide constant, you should use [`static const`](./language.md#static) instead.

> [!TIP]
> The implementation of the [`<const>`](#const) tag is conceptually identical to [`<return>`](#return)ing its `input.value`. 🤯
>
> ```marko
> /* const.marko */
> export interface Input<T> {
>   value: T;
> }
>
> <return=input.value>
> ```

## `<return>`

The `<return>` tag allows any [custom tag](./custom-tag.md) to expose a [Tag Variable](./language.md#tag-variables).

The `value=` attribute (usually expressed via the [shorthand](./language.md#shorthand-value)) is made available as the tag variable of the template.

```marko
/* answer.marko */
<return=42>
```

The return value may then be used in the parent template:

```marko
<answer/value/>

<div>${value}</div>
```

### Assignable Return Value

By default, an exposed variable can not be assigned a value. Value assignment may be enabled with the `valueChange=` attribute on the `<return>`.

If a `valueChange=` attribute is provided, it is called whenever the tag variable is assigned a value.

```marko
/* uppercase.marko */
export interface Input {
  value: string;
}

<let/value = input.value.toUpperCase()>

<return=value valueChange(newValue) {
  value = newValue.toUpperCase();
}/>
```

In the above example, the exposed tag variable is initialized to an UPPERCASE version of `input.value` and when new values are assigned it will first UPPERCASE the value before storing it in state.

```marko
<uppercase/value=""/>
<input onInput(e) { value = e.target.value }/>
<div>${value}</div> // value is always uppercased
```

## `<script>`

The `<script>` tag has special behavior in Marko.

The content of a `<script>` tag is executed first when the template has finished rendering and is mounted in the browser.
It will also be executed _again_ after any [Tag Variable](./language.md#tag-variables) or [Tag Parameter](./language.md#tag-parameters) it references has changed.

```marko
<let/count=1>
<button/myButton onClick() { count++ }>
  Current count: ${count}
</button>

<script>
  // Runs in the browser for each instance of this tag.
  // Also runs when either `myButton` or `count` updates
  console.log("clicked", myButton(), count, "times");
</script>
```

Often the `<script>` tag is coupled with the [`$signal` api](./language.md#signal) to apply some side effect, and cleanup afterward.

```marko
<script>
  const intervalId = setInterval(() => {
    console.log("time", Date.now());
  }, 1000);

  $signal.onabort = () => clearInterval(intervalId);
</script>
```

> [!TIP]
> There are very few cases where you should be using a _real_ `<script>` tag, but if you absolutely need it you can use the [`<html-script>`](#html-script--html-style) fallback.

## `<style>`

The `<style>` tag has special behavior in Marko. No matter how many times a component renders, its styles are only loaded once.

```marko
<style>
  /* Bundled and loaded once */
  body {
    color: green;
  }
</style>
```

The `<style>` may include a file extension to enable css preprocessors such as [scss](https://sass-lang.com/documentation/syntax/#scss) and [less](https://lesscss.org/).

```marko
<style.scss>
  $primary-color: green;

  .fancy-scss {
    color: $primary-color;
  }
</style>

<div class="fancy-scss">Hello!</div>

<style.less>
  @primary-color: blue;

  .fancy-less {
    color: @primary-color;
  }
</style>

<div class="fancy-less">Hello!</div>
```

If the `<style>` tag has a [Tag Variable](./language.md#tag-variables), it leverages [CSS Modules](https://github.com/css-modules/css-modules) to expose its classes as an object.

```marko
<style/styles>
  .foo { border: 1px solid red }
  .bar { color: green }
</style>

<div class=styles.foo />
<div class=[styles.foo, styles.bar] />
<div class={ [styles.bar]: true } />
<div.${styles.foo} />
```

> [!TIP]
> There are very few cases where you should be using a _real_ inline `<style>` tag but if needed you can use the fallback [`<html-style>`](#html-script--html-style) tag.

## `<define>`

The `<define>` tag is primarily used to create reusable snippets of markup that can be shared across the template.

```marko
<define/MyTag|input: { name: string }| foo=1>
  <span>Hello ${input.name}</span>
</>

<MyTag name="HTML"/>
<MyTag name="Marko"/>

<div>${MyTag.foo}</div>
```

The [Tag Variable](./language.md#tag-variables) reflects the attributes the `<define>` tag was provided (including the [content](./language.md#tag-content)).

> [!TIP]
> The implementation of the `<define>` tag above is conceptually identical to [`<return>`](#return)ing its `input`. 🤯
>
> ```marko
> /* define.marko */
> export type Input<T> = T;
> <return=input>
> ```

## `<lifecycle>`

The `<lifecycle>` tag is used to synchronize side-effects from imperative client APIs.

```marko
<lifecycle
  onMount() {
    // Called once this tag is attached to the dom, and never again.
  }
  onUpdate() {
    // Called every time the dependencies of the `onUpdate` function are invalidated.
  }
  onDestroy() {
    // Called once this tag is removed from the dom.
  }
/>
```

The `this` is consistent across the lifetime of the `<lifecycle>` tag and can be mutated.

```marko
client import { WorldMap } from "world-map-api";

<let/latitude = 0>
<let/longitude = 0>
<div/container/>
<lifecycle<{ map: WorldMap }>
  onMount() {
    this.map = new WorldMap(container(), { latitude, longitude, zoom });
  }
  onUpdate() {
    this.map.setCoords(latitude, longitude);
    this.map.setZoom(zoom);
  }
  onDestroy() {
    this.map.destroy();
  }
/>
```

> [!TIP]
> All attributes on the `<lifecycle>` tag attributes available as the `this` in any of the event handler attributes.

## `<id>`

The `<id>` tag exposes a [Tag Variable](./language.md#tag-variables) with a short unique id string (compatible with [`id=` and aria attributes](https://developer.mozilla.org/en-US/docs/Web/HTML/Global_attributes/id)).

```marko
<id/cheeseId/>
<label for=cheeseId>Do you like cheese?</label>
<input id=cheeseId type="checkbox" name="cheese">
```

If the `value=` attribute contains a non-nullable value, it will be used instead of the generated one.

```marko
/* textbox.marko */
export interface Input {
  id?: string;
  description: string;
}

<id/id=input.id>

<input aria-describedby=id>
<span id=id>${description}</span>
```

## `<log>`

The `<log>` tag performs a [console.log](https://developer.mozilla.org/en-US/docs/Web/API/console/log_static) of its `value=` attribute (shown here using [the shorthand](./language.md#shorthand-value)).

The log is re-executed each time its tag variable updates.

```marko
<let/count=0>
<log=`Current count: ${count}`>
<button onClick() { count++ }>Log</button>
```

This logs `Current count: 0` on both server and client and again whenever `count` changes.

## `<debug>`

The `<debug>` tag injects a [`debugger` statement](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/debugger) within the template that will be executed once the tag renders.

```marko
export interface Input {
  stuff: any;
}

<const/{ stuff } = input>

<debug/> // Can be useful to inspect render-scoped variables with a debugger.
```

If a `value=` attribute is included, the debugger will be executed whenever it changes.

```marko
export interface Input {
  firstName: string;
  lastName: string;
}

<debug=[input.firstName, input.lastName]>
```

This debugger executes on the initial render and whenever `input.firstName` or `input.lastName` changes.

## `<await>`

The `<await>` tag unwraps the promise in its [`value=` attribute](./language.md#shorthand-value) and exposes it through a [tag parameter](./language.md#tag-parameters).

```marko
<await|user|=getUser()>
  <img src=user.avatar>
  ${user.name}
</await>
```

If this tag has a [`<try>`](#try) ancestor with a [`@placeholder`](#placeholder), the placeholder content is shown while the promise is pending.

```marko
<try>
  <div>
    <await|user|=getUser()>
      ${user.name}
    </await>
  </div>

  <@placeholder>
    Loading...
  </@placeholder>

  <@catch|err|>
    ${err.message}
  </@catch>
</try>
```

## `<try>`

The `<try>` tag is used for catching runtime errors and managing asynchronous boundaries. It has two optional [attribute tags](./language.md#attribute-tags): `@catch` and `@placeholder`.

### `@catch`

When a runtime error occurs in the [content](./language.md#tag-content) of the `<try>` or its `@placeholder` attribute tag, the content is replaced with the content of the `@catch` attribute tag. The thrown `error` is made available as the [tag parameter](./language.md#tag-parameters) of the `@catch`.

```marko
<try>
  <const/foo = { bar: { baz: 1 } }>
  ${foo.baz.bar} // 💥 boom! 👇

  <@catch|err|>
    ${err.message} // "Cannot read property `bar` of undefined"
  </@catch>
</try>
```

### `@placeholder`

The [content](./language.md#tag-content) of the `@placeholder` [attribute tag](./language.md#attribute-tags) will be displayed while an [`<await>` tag](#await) is pending inside of the content of the `<try>`.

## `<html-comment>`

By default, [html comments](./language.md#Comments) are stripped from the output. The `<html-comment>` tag is used to output a literal `<!-- comment -->`.

```marko
<html-comment>Hello, view source</html-comment>
```

This tag also exposes a [tag variable](./language.md#tag-variables) which contains a getter to the reference of the [comment node](https://developer.mozilla.org/en-US/docs/Web/API/Comment) in the DOM.

```marko
<html-comment/commentNode/>

<return() {
  return commentNode().parentNode.getBoundingClientRect()
}/>
```

## `<html-script>` & `<html-style>`

The [`<script>`](./native-tag.md#script) and [`<style>`](./native-tag.md#style) tags are enhanced to enable best practices and help developers avoid common footguns.

Though not typically needed, vanilla versions of these tags may be written via the `<html-script>` and `<html-style>` tags respectively.

> [!CAUTION]
> The `<html-*>` tags are only used for specialized use cases, and should _almost never_ be used over [`<script>`](./native-tag.md#script) or [`<style>`](./native-tag.md#style).

```marko
// Literally written out as a `<script>` html tag.
<html-script type="importmap">
  { "imports": { "square": "./module/shapes/square.js" } }
</html-script>

// Literally written out as a `<style>` html tag.
<html-style>
  @import url('https://fonts.googleapis.com/css2?family=Ubuntu&display=swap');
</html-style>
```
