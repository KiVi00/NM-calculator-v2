document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("calculatorForm");
  const expressionInput = document.getElementById("expression");
  const epsilonInput = document.getElementById("accuracy");
  const derivativeInput = document.getElementById("derivative");
  const methods = document.querySelectorAll('input[name="method"]');
  const x0all = document.getElementById("x0-all");
  const x1all = document.getElementById("x1");
  const results = document.getElementById("results");

  const groups = {
    x0all: document.getElementById("x0-group"),
    x1: document.getElementById("x1-group"),
    derivative: document.getElementById("derivative-group"),
    newton: document.getElementById("newton-group"),
  };

  methods.forEach((method) => {
    method.addEventListener("change", () => {
      updateInputFields();
      document.getElementById("results").style.display = "none";
    });
  });

  document.getElementById("solve").addEventListener("click", solve);
  document.getElementById("solve").addEventListener("click", updateDerivative);

  function updateInputFields() {
    const method = document.querySelector('input[name="method"]:checked').value;

    Object.values(groups).forEach((group) => (group.style.display = "none"));

    switch (method) {
      case "bisection":
      case "chord":
      case "golden-section":
      case "secant":
        groups.x0all.style.display = groups.x1.style.display = "block";
        document.getElementById("derivative-display").style.display = "none";
        break;
      case "newton":
        groups.newton.style.display = "block";
        document.getElementById("derivative-display").style.display = "block";

        break;
    }
  }

  function validateEpsilon(epsilon) {
    if (isNaN(epsilon)) {
      throw new Error("Точность должна быть числом");
    }
    if (epsilon < 1e-15) {
      throw new Error("Точность должна быть больше 1e-15");
    }
    if (epsilon > 1) {
      throw new Error("Точность не может быть больше 1");
    }
    return true;
  }

  function updateDerivative() {
    try {
      const expr = expressionInput.value;
      if (!expr) return;

      const f = math.parse(expr);
      const derivative = math.derivative(f, "x");

      // Генерация LaTeX
      const latexFunc = f.toTex();
      const latexDeriv = derivative.toTex();

      // Обновление отображения формул
      document.getElementById("function-display").innerHTML = `
        Записанная функция: $\\displaystyle ${latexFunc}$`;

      document.getElementById("derivative-display").innerHTML = `
        Полученная производная: $\\displaystyle ${latexDeriv}$`;

      // Обновление MathJax
      MathJax.typesetPromise();

      // Для текстового поля производной (опционально)
      derivativeInput.value = derivative.toString();
    } catch (e) {
      document.getElementById("function-display").innerHTML =
        "Ошибка в функции";
      document.getElementById("derivative-display").innerHTML =
        "Ошибка в производной";
      derivativeInput.value = "Не удалось вычислить";
    }
  }

  function solve() {
    results.style.display = "block";
    clearOutput();
    try {
      const method = document.querySelector(
        'input[name="method"]:checked'
      ).value;
      const epsilon = parseFloat(epsilonInput.value);
      validateEpsilon(epsilon);
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
      displayResult(result, epsilon);
    } catch (e) {
      showError(e.message);
    }
  }

  function bisectionMethod(f, epsilon) {
    let x0 = parseFloat(x0all.value);
    let x1 = parseFloat(x1all.value);
    console.log(f(x0));
    if (isNaN(f(x0)) || f(x0) === -Infinity || f(x0) === +Infinity) {
      throw new Error("Ошибка вычисления f(x0)");
    }
    if (isNaN(x0)) throw new Error("x0 не является числом");
    if (isNaN(x1)) throw new Error("x1 не является числом");
    if (f(x0) * f(x1) >= 0)
      throw new Error(
        "Нет корня в интервале, либо на интервале несколько корней"
      );

    const iterations = [];
    let c;

    do {
      c = (x0 + x1) / 2;
      if (isNaN(f(c)) || f(c) === -Infinity || f(c) === +Infinity) {
        throw new Error("Ошибка вычисления f(c)");
      }
      iterations.push({ x0, x1, c, f_c: f(c), f_x0: f(x0) });

      if (Math.abs(f(c)) < epsilon) break;

      if (f(c) * f(x0) < 0) x1 = c;
      else x0 = c;
    } while (Math.abs(x1 - x0) > epsilon && iterations.length < 10000);

    if (iterations.length >= 10000) throw new Error("Превышено макс. итераций (10^4)");
    return { root: c, iterations };
  }

  function newtonMethod(f, epsilon) {
    let x = parseFloat(document.getElementById("x0").value);
    if (isNaN(x)) throw new Error("x0 не является числом");
    const fPrime = compileFunction(derivativeInput.value);
    const iterations = [];

    do {
      const fx = f(x);
      if (isNaN(f(x)) || f(x) === -Infinity || f(x) === +Infinity) {
        throw new Error("Ошибка вычисления f(x)");
      }
      const dfx = fPrime(x);
      if (isNaN(dfx) || dfx === -Infinity || dfx === +Infinity) {
        throw new Error("Ошибка вычисления f(x)");
      }
      if (Math.abs(dfx) < 1e-10) throw new Error("Производная слишком мала");

      const nextX = x - fx / dfx;
      iterations.push({ x, fx, dfx, nextX });
      x = nextX;
    } while (Math.abs(f(x)) > epsilon && iterations.length < 10000);

    if (iterations.length >= 10000) throw new Error("Превышено макс. итераций (10^4)");
    return { root: x, iterations };
  }

  function chordMethod(f, epsilon) {
    let x0 = parseFloat(x0all.value);
    let x1 = parseFloat(x1all.value);
    if (isNaN(f(x0)) || f(x0) === -Infinity || f(x0) === +Infinity) {
      throw new Error("Ошибка вычисления f(x0)");
    }
    if (isNaN(f(x1)) || f(x1) === -Infinity || f(x1) === +Infinity) {
      throw new Error("Ошибка вычисления f(x1)");
    }
    if (f(x0) * f(x1) >= 0)
      throw new Error(
        "Нет корня в интервале, либо на интервале несколько корней"
      );

    const iterations = [];
    let c,
      prevX = x1;

    do {
      prevX = c;
      if (f(x1) - f(x0) == 0) throw new Error("Возникает деление на 0");
      c = x0 - (f(x0) * (x1 - x0)) / (f(x1) - f(x0));
      if (isNaN(f(c)) || f(c) === -Infinity || f(c) === +Infinity) {
        throw new Error("Ошибка вычисления f(c)");
      }
      iterations.push({ x0, x1, c, f_c: f(c) });

      if (f(c) * f(x0) < 0) {
        x1 = c;
      } else {
        x0 = c;
      }
    } while (
      (Math.abs(c - prevX) > epsilon || Math.abs(f(c)) > epsilon) &&
      iterations.length < 10000
    );

    if (iterations.length >= 10000) throw new Error("Превышено макс. итераций (10^4)");
    return { root: c, iterations };
  }

  function secantMethod(f, epsilon) {
    let x0 = parseFloat(document.getElementById("x0-all").value);
    let x1 = parseFloat(document.getElementById("x1").value);
    const iterations = [];

    do {
      const f0 = f(x0);
      if (isNaN(f(x0)) || f(x0) === -Infinity || f(x0) === +Infinity) {
        throw new Error("Ошибка вычисления f(x0)");
      }
      const f1 = f(x1);
      if (isNaN(f(x1)) || f(x1) === -Infinity || f(x1) === +Infinity) {
        throw new Error("Ошибка вычисления f(x1)");
      }
      if (f1 - f0 === 0) throw new Error("Возникает деление на 0");
      const dx = (f1 * (x1 - x0)) / (f1 - f0);
      if (isNaN(dx) || dx === -Infinity || dx === +Infinity) {
        throw new Error("Ошибка вычисления dx");
      }
      const nextX = x1 - dx;

      iterations.push({ x0, x1, f_x0: f0, f_x1: f1, dx, nextX });
      x0 = x1;
      x1 = nextX;
    } while (Math.abs(x1 - x0) > epsilon && iterations.length < 10000);

    if (iterations.length >= 10000) throw new Error("Превышено макс. итераций (10^4)");
    return { root: x1, iterations };
  }

  function goldenSectionMethod(f, epsilon) {
    const phi = (1 + Math.sqrt(5)) / 2;
    let x0 = parseFloat(document.getElementById("x0-all").value);
    if (isNaN(f(x0)) || f(x0) === -Infinity || f(x0) === +Infinity) {
      throw new Error("Ошибка вычисления f(x0)");
    }
    let x1 = parseFloat(document.getElementById("x1").value);
    if (isNaN(f(x1)) || f(x1) === -Infinity || f(x1) === +Infinity) {
      throw new Error("Ошибка вычисления f(x1)");
    }
    const iterations = [];

    if (f(x0) * f(x1) >= 0)
      throw new Error(
        "Нет корня в интервале, либо на интервале несколько корней"
      );

    let x0_phi = x1 - (x1 - x0) / phi;
    let x1_phi = x0 + (x1 - x0) / phi;
    if (
      isNaN(f(x0_phi)) ||
      f(x0_phi) === -Infinity ||
      f(x0_phi) === +Infinity
    ) {
      throw new Error("Ошибка вычисления f(x0_phi)");
    }
    let f1 = f(x0_phi);
    if (
      isNaN(f(x1_phi)) ||
      f(x1_phi) === -Infinity ||
      f(x1_phi) === +Infinity
    ) {
      throw new Error("Ошибка вычисления f(x1_phi)");
    }
    let f2 = f(x1_phi);

    while (Math.abs(x1 - x0) > epsilon && iterations.length < 10000) {
      iterations.push({ x0, x1, x0_phi, x1_phi });

      if (f(x0) * f1 < 0) {
        x1 = x1_phi;
        x1_phi = x0_phi;
        f2 = f1;
        x0_phi = x1 - (x1 - x0) / phi;
        f1 = f(x0_phi);
      } else if (f2 * f(x1) < 0) {
        x0 = x0_phi;
        x0_phi = x1_phi;
        f1 = f2;
        x1_phi = x0 + (x1 - x0) / phi;
        f2 = f(x1_phi);
      } else {
        x0 = x0_phi;
        x1 = x1_phi;
        x0_phi = x1 - (x1 - x0) / phi;
        x1_phi = x0 + (x1 - x0) / phi;
        f1 = f(x0_phi);
        f2 = f(x1_phi);
      }
    }
    if (iterations.length >= 10000) throw new Error("Превышено макс. итераций (10^4)");
    return { root: (x0 + x1) / 2, iterations };
  }

  function compileFunction(expr) {
    if (expr.trim() == "") {
      throw new Error("Функция не написана");
    }
    return (x) => {
      try {
        return math.evaluate(expr, { x });
      } catch (e) {
        throw new Error(`Ошибка вычисления: ${e.message}`);
      }
    };
  }

  function displayResult({ root, iterations }, epsilon) {
    const precisionResult = roundToPrecision(root, epsilon);
    document.getElementById("output").innerHTML = `
        Корень: ${precisionResult}<br>
        Итераций: ${iterations.length}
    `;
    MathJax.typesetPromise();
    const iterationsElement = document.getElementById("iterations");
    document.getElementById("re");
    document.getElementById("formulas").style.display = "block";
    iterationsElement.style.display = "block";
    iterationsElement.textContent = iterations
      .map((iter, i) => `Итерация ${i + 1}:\n${JSON.stringify(iter, null, 2)}`)
      .join("\n\n");
  }

  function showError(message) {
    document.getElementById("formulas").style.display = "none";
    document.getElementById("iterations").style.display = "none";
    document.getElementById("error").textContent = message;
    document.getElementById("error").style.display = "block";
  }

  function clearOutput() {
    document.getElementById("output").innerHTML = "";
    document.getElementById("iterations").textContent = "";
    document.getElementById("error").style.display = "none";
    document.getElementById("iterations").style.display = "none";
    document.getElementById("formulas").style.display = "none";
  }

  function roundToPrecision(root, epsilon) {
    const decimalPlaces = Math.max(
      0,
      Math.abs(Math.floor(Math.log10(epsilon)))
    );
    return root.toFixed(decimalPlaces);
  }

  updateInputFields();
});
