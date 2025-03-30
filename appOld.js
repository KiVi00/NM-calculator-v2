document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("calculatorForm");
  const expressionInput = document.getElementById("expression");
  const derivativeInput = document.getElementById("derivative");
  const methods = document.querySelectorAll('input[name="method"]');
  const x0all = document.getElementById("x0-all");
  const x1 = document.getElementById("x1");

  const groups = {
    x0all: document.getElementById("x0-group"),
    x1: document.getElementById("x1-group"),
    derivative: document.getElementById("derivative-group"),
    newton: document.getElementById("newton-group"),
  };

  methods.forEach((method) =>
    method.addEventListener("change", updateInputFields)
  );
  expressionInput.addEventListener("input", updateDerivative);
  document.getElementById("solve").addEventListener("click", solve);

  function updateInputFields() {
    const method = document.querySelector('input[name="method"]:checked').value;

    Object.values(groups).forEach((group) => (group.style.display = "none"));

    switch (method) {
      case "bisection":
      case "chord":
      case "golden-section":
      case "secant":
        groups.x0all.style.display = groups.x1.style.display = "block";
        break;
      case "newton":
        groups.newton.style.display = "block";
        groups.derivative.style.display = "block";
        break;
    }
  }

  function updateDerivative() {
    try {
      const expr = expressionInput.value;
      if (!expr) return;

      const f = math.parse(expr);
      const derivative = math.derivative(f, "x").toString();
      derivativeInput.value = derivative;
    } catch (e) {
      derivativeInput.value = "Не удалось вычислить";
    }
  }

  function solve() {
    clearOutput();
    try {
      const method = document.querySelector(
        'input[name="method"]:checked'
      ).value;
      const epsilon = parseFloat(document.getElementById("accuracy").value);
      const f = compileFunction(expressionInput.value);

      let result;
      switch (method) {
        case "bisection":
          result = bisectionMethod(f, epsilon);
          break;
        case "newton":
          result = newtonMethod(f, epsilon);
          break;
        case "chord":
          result = chordMethod(f, epsilon);
          break;
        case "secant":
          result = secantMethod(f, epsilon);
          break;
        case "golden-section":
          result = goldenSectionMethod(f, epsilon);
          break;
      }

      displayResult(result);
    } catch (e) {
      showError(e.message);
    }
  }

  function bisectionMethod(f, epsilon) {
    let a = parseFloat(x0all.value);
    let b = parseFloat(x1.value);
    if (f(a) * f(b) >= 0) throw new Error("Нет корня в интервале");

    const iterations = [];
    let c;

    do {
      c = (a + b) / 2;
      const fc = f(c);
      iterations.push({ a, b, c, f_c: fc });

      if (Math.abs(fc) < epsilon) break;

      if (fc * f(a) < 0) b = c;
      else a = c;
    } while (Math.abs(b - a) > epsilon);

    return { root: c, iterations };
  }

  function newtonMethod(f, epsilon) {
    let x = parseFloat(document.getElementById("x0").value) || 1;
    const fPrime = compileFunction(derivativeInput.value);
    const iterations = [];

    do {
      const fx = f(x);
      const dfx = fPrime(x);
      if (Math.abs(dfx) < 1e-10) throw new Error("Производная слишком мала");

      const nextX = x - fx / dfx;
      iterations.push({ x, fx, dfx, nextX });
      x = nextX;
    } while (Math.abs(f(x)) > epsilon && iterations.length < 1000);

    if (iterations.length >= 1000) throw new Error("Превышено макс. итераций");
    return { root: x, iterations };
  }

  function chordMethod(f, epsilon) {
    let a = parseFloat(x0all.value);
    let b = parseFloat(x1.value);
    if (f(a) * f(b) >= 0) throw new Error("Нет корня в интервале");

    const iterations = [];
    let x,
      prevX = b; // Начинаем с `b`, чтобы избежать лишнего вычисления

    do {
      prevX = x;
      x = a - (f(a) * (b - a)) / (f(b) - f(a));
      iterations.push({ a, b, x, f_x: f(x) });

      // Фиксируем конец, где знак не меняется (классический метод хорд)
      if (f(x) * f(a) < 0) {
        b = x;
      } else {
        a = x;
      }
    } while (
      (Math.abs(x - prevX) > epsilon || Math.abs(f(x)) > epsilon) &&
      iterations.length < 1000
    );

    if (iterations.length >= 1000) throw new Error("Превышено макс. итераций");
    return { root: x, iterations };
  }

  function secantMethod(f, epsilon) {
    let x0 = parseFloat(document.getElementById("x0-secant").value);
    let x1 = parseFloat(document.getElementById("x1-secant").value);
    const iterations = [];

    do {
      const f0 = f(x0);
      const f1 = f(x1);
      const dx = (f1 * (x1 - x0)) / (f1 - f0);
      const nextX = x1 - dx;

      iterations.push({ x0, x1, nextX });
      x0 = x1;
      x1 = nextX;
    } while (Math.abs(x1 - x0) > epsilon && iterations.length < 1000);

    if (iterations.length >= 1000) throw new Error("Превышено макс. итераций");
    return { root: x1, iterations };
  }

  function goldenSectionMethod(f, epsilon) {
    const phi = (1 + Math.sqrt(5)) / 2; // Золотое сечение (~1.618)
    let a = parseFloat(x0all.value);
    let b = parseFloat(x1.value);
    const iterations = [];

    if (f(a) * f(b) >= 0) throw new Error("Нет корня в интервале");

    // Инициализация точек деления
    let x1 = b - (b - a) / phi;
    let x2 = a + (b - a) / phi;
    let f1 = f(x1);
    let f2 = f(x2);

    while (Math.abs(b - a) > epsilon) {
      iterations.push({ a, b, x1, x2 });

      // Корень в левой части [a, x2]
      if (f(a) * f1 < 0) {
        b = x2;
        x2 = x1;
        f2 = f1;
        x1 = b - (b - a) / phi;
        f1 = f(x1);
      }
      // Корень в правой части [x1, b]
      else if (f2 * f(b) < 0) {
        a = x1;
        x1 = x2;
        f1 = f2;
        x2 = a + (b - a) / phi;
        f2 = f(x2);
      }
      // Корень в средней части [x1, x2]
      else {
        a = x1;
        b = x2;
        x1 = b - (b - a) / phi;
        x2 = a + (b - a) / phi;
        f1 = f(x1);
        f2 = f(x2);
      }
    }

    return { root: (a + b) / 2, iterations };
  }

  function compileFunction(expr) {
    return (x) => {
      try {
        return math.evaluate(expr, { x });
      } catch (e) {
        throw new Error(`Ошибка вычисления: ${e.message}`);
      }
    };
  }

  function displayResult({ root, iterations }) {
    document.getElementById("output").innerHTML = `
          Корень: ${root.toFixed(7)}<br>
          Итераций: ${iterations.length}
      `;
    document.getElementById("iterations").textContent = iterations
      .map((iter, i) => `Итерация ${i + 1}:\n${JSON.stringify(iter, null, 2)}`)
      .join("\n\n");
  }

  function showError(message) {
    document.getElementById("error").textContent = message;
    document.getElementById("error").style.display = "block";
  }

  function clearOutput() {
    document.getElementById("output").innerHTML = "";
    document.getElementById("iterations").textContent = "";
    document.getElementById("error").style.display = "none";
  }

  updateInputFields();
  handleFunctionInput();
});
